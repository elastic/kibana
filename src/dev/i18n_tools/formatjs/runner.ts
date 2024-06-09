/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Opts, transformWithTs } from '@formatjs/ts-transformer';

import difference from 'lodash/difference';
import * as icuParser from '@formatjs/icu-messageformat-parser';
import type { MessageFormatElement } from '@formatjs/icu-messageformat-parser';

import ts from 'typescript';
type TypeScript = typeof ts;

import { extractMessagesFromCallExpression, MessageDescriptor } from '../extractors/call_expt';
import { extractMessageFromJsxComponent } from '../extractors/react';

export function isI18nTranslateFunction(node: ts.Node) {
  return ts.isCallExpression(node);

  //   return (
  //     ts.isCallExpression(node) &&
  //     (ts.isIdentifier(node.callee, { name: 'i18n' }) ||
  //       (ts.isMemberExpression(node.callee) &&
  //         ts.isIdentifier(node.callee.object, { name: 'i18n' }) &&
  //         ts.isIdentifier(node.callee.property, { name: 'translate' })))
  //   );
}

function getVisitor(
  typescript: TypeScript,
  ctx: ts.TransformationContext,
  sf: ts.SourceFile,
  opts: Opts
) {
  const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
    let newNode: ts.Node = node;

    if (typescript.isCallExpression(node)) {
      newNode = extractMessagesFromCallExpression(ts, ctx.factory, node, opts, sf) as ts.Node;
    } else if (typescript.isJsxOpeningElement(node) || typescript.isJsxSelfClosingElement(node)) {
      newNode = extractMessageFromJsxComponent(
        ts,
        ctx.factory,
        node as ts.JsxOpeningElement,
        opts,
        sf
      ) as ts.Node;
    }

    return typescript.visitEachChild(newNode, visitor, ctx);
  };
  return visitor;
}

export function normalizeI18nTranslateSignature(
  typescript: TypeScript,
  opts: Opts & { onMsgWithValuesExtracted: any }
) {
  const transformFn: ts.TransformerFactory<ts.SourceFile> = (ctx) => {
    return (sf) => {
      return typescript.visitEachChild(sf, getVisitor(typescript, ctx, sf, opts), ctx);
    };
  };

  return transformFn;
}

export const extractValues = (elements) => {
  return elements.reduce((acc, element) => {
    if (icuParser.isTagElement(element)) {
      acc.push(element.value);
      const nested = extractValues(element.children);
      nested.forEach((item) => acc.push(item));
    } else if (icuParser.isSelectElement(element) || icuParser.isPluralElement(element)) {
      acc.push(element.value);
      const optionElements = Object.values(element.options).flatMap(({ value }) => value);
      const nested = extractValues(optionElements);
      nested.forEach((item) => acc.push(item));
    } else if (!icuParser.isLiteralElement(element) && !icuParser.isPoundElement(element)) {
      acc.push(element.value);
    }

    return acc;
  }, [] as string[]);
};

export const verifyMessagesWithValues = (
  messageDescriptor: MessageDescriptor,
  elements: MessageFormatElement[]
) => {
  if (elements.every(icuParser.isLiteralElement)) {
    // All message elements are literals (plain text)
    // no values must be defined in the message definition.
    if (messageDescriptor.hasValuesObject) {
      throw new Error(
        `Messsage with ID ${messageDescriptor.id} in ${messageDescriptor.file} has defined values while the defaultMessage does not require any.`
      );
    }
    return;
  }

  const valuesInsideMessage = [...new Set(extractValues(elements))];

  const excessValues = difference(messageDescriptor.valuesKeys || [], valuesInsideMessage);
  // console.log('messageDescriptor::', messageDescriptor);
  // console.log('valuesInsideMessage::', valuesInsideMessage);
  // console.log('excessValues::', excessValues);
  if (excessValues.length) {
    throw new Error(
      `Messsage with ID ${messageDescriptor.id} in ${
        messageDescriptor.file
      } has the following unnecessary values [${excessValues.join(', ')}]`
    );
  }

  const nonDefinedValues = difference(valuesInsideMessage, messageDescriptor.valuesKeys || []);
  // console.log('nonDefinedValues::', nonDefinedValues);
  if (nonDefinedValues.length) {
    throw new Error(
      `Messsage with ID ${messageDescriptor.id} in ${
        messageDescriptor.file
      } requires the following values [${nonDefinedValues.join(', ')}] to be defined.`
    );
  }
};

// TODO:
// Open an issue to allow not defining a defaultMessages
// Combine messages that dont have a defaultMessage with the ones that has one.
// verify that each message with an id only has it defined somewhere in the namespace
// all output contains default messsages

// TODO:
// Show each plugin translations count

// TODO:
// How about using kibana.json instead of .i18nrc file to define namespace prefix

// Next:
// test case for double count

export const verifyMessageDescriptor = (
  defaultMessage: string,
  messageDescriptor: MessageDescriptor
) => {
  const elements = icuParser.parse(defaultMessage, {
    requiresOtherClause: true,
    shouldParseSkeletons: true,
    ignoreTag: messageDescriptor.ignoreTag,
  });

  verifyMessagesWithValues(messageDescriptor, elements);
};

export const verifyMessageIdStartsWithNamespace = (
  messageDescriptor: MessageDescriptor,
  namespace: string
): boolean => {
  /**
   * Example:
   * namespace: advancedSettings
   * Valid messageId: advancedSettings.advancedSettingsLabel
   * Invalid messageId: advancedSettings123.advancedSettingsLabel
   * Invalid messageId: something_else.advancedSettingsLabel
   */

  return messageDescriptor.id.startsWith(`${namespace}.`);
};

export async function extractI18nMessageDescriptors(fileName: string, source: string) {
  // let extractedMessages: any[] = [];
  const extractedMessages = new Map<string, MessageDescriptor>();

  try {
    ts.transpileModule(source, {
      compilerOptions: {
        allowJs: true,
        target: ts.ScriptTarget.ESNext,
        noEmit: true,
        experimentalDecorators: true,
      },
      reportDiagnostics: true,
      fileName,
      transformers: {
        before: [
          normalizeI18nTranslateSignature(ts, {
            extractSourceLocation: true,
            ast: true,
            onMsgWithValuesExtracted(filePath, msgs) {
              // console.log('msgs inside values::', msgs)
              msgs.map((msg) => {
                const newDefinition = { ...msg };
                const { id } = msg;
                // TODO: check if message not matching first
                // if (extractedMessages.has(id)) {
                //   throw new Error(`During normalization Message with id ${id} already defined in ${extractedMessages.get(id)!.file}.`)
                // }

                extractedMessages.set(id, newDefinition);
              });
            },
          }),
          transformWithTs(ts, {
            additionalFunctionNames: ['translate'],
            extractSourceLocation: true,
            removeDefaultMessage: true,
            ast: true,
            onMsgExtracted(filePath, msgs) {
              // console.log('msgs inside extracted::', msgs)
              // console.log('extractedMessages::', extractedMessages)

              msgs.map((msg) => {
                const { id } = msg;
                if (extractedMessages.has(id)) {
                  const existingMsg = extractedMessages.get(id);

                  // if (!existingMsg!.hasValuesObject) {
                  //   throw new Error(`during formatjs ts Message with id ${id} already defined in ${existingMsg!.file}.`);
                  // }
                  extractedMessages.set(id, {
                    ...existingMsg,
                    ...msg,
                  });
                  return;
                }

                extractedMessages.set(id, msg);
              });
            },
          }),
        ],
      },
    });
  } catch (err) {
    throw new Error(`Error parsing file ${fileName}: ${err}`);
  }

  return extractedMessages;
}

// const formatJsRunner = async (filePaths: string[]) => {
//   for (const filePath of filePaths) {
//     const source = await readFile(filePath, 'utf8');
//     const extractedMessages = await extractI18nMessageDescriptors(filePath, source);

//     console.log('final extractedMessages::', extractedMessages);

//     extractedMessages.forEach(messageDescriptor => {
//       verifyMessageDescriptor(messageDescriptor)
//     });
//   }
// }

// formatJsRunner(['src/dev/i18n_tools/__fixtures__/extraction_signatures/not_defined_value.ts']);

// formatJsRunner(['src/dev/i18n_tools/__fixtures__/extraction_signatures/unused_value.ts']);
// formatJsRunner(['src/dev/i18n_tools/__fixtures__/extraction_signatures/malformed_icu.ts']);
// formatJsRunner(['src/dev/i18n_tools/__fixtures__/extraction_signatures/malformed_icu.ts']);

// formatJsRunner(['src/dev/i18n_tools/__fixtures__/extraction_signatures/i18n_translate.ts']);

// React
// formatJsRunner(['src/dev/i18n_tools/__fixtures__/extraction_signatures/intl_prop.tsx']);
// formatJsRunner(['src/dev/i18n_tools/__fixtures__/extraction_signatures/react_component.tsx']);
// formatJsRunner(['packages/core/apps/core-apps-browser-internal/src/status/components/version_header.tsx']);
