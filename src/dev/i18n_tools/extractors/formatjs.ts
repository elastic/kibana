/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformWithTs } from '@formatjs/ts-transformer';

import difference from 'lodash/difference';
import * as icuParser from '@formatjs/icu-messageformat-parser';
import type { MessageFormatElement } from '@formatjs/icu-messageformat-parser';

import ts from 'typescript';
type TypeScript = typeof ts;

import { extractMessagesFromCallExpression, MessageDescriptor, ExtractorOpts } from './call_expt';
import { extractMessageFromJsxComponent } from './react';

function getVisitor(
  typescript: TypeScript,
  ctx: ts.TransformationContext,
  sf: ts.SourceFile,
  opts: ExtractorOpts
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

export function normalizeI18nTranslateSignature(typescript: TypeScript, opts: ExtractorOpts) {
  const transformFn: ts.TransformerFactory<ts.SourceFile> = (ctx) => {
    return (sf) => {
      return typescript.visitEachChild(sf, getVisitor(typescript, ctx, sf, opts), ctx);
    };
  };

  return transformFn;
}

export const extractValues = (elements: MessageFormatElement[]) => {
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
  if (excessValues.length) {
    throw new Error(
      `Messsage with ID ${messageDescriptor.id} in ${
        messageDescriptor.file
      } has the following unnecessary values [${excessValues.join(', ')}]`
    );
  }

  const nonDefinedValues = difference(valuesInsideMessage, messageDescriptor.valuesKeys || []);
  if (nonDefinedValues.length) {
    throw new Error(
      `Messsage with ID ${messageDescriptor.id} in ${
        messageDescriptor.file
      } requires the following values [${nonDefinedValues.join(', ')}] to be defined.`
    );
  }
};

export const verifyMessageDescriptor = (
  defaultMessage: string | undefined,
  messageDescriptor: MessageDescriptor
) => {
  if (typeof defaultMessage !== 'string') {
    throw new Error('We require each i18n definition to include a `defaultMessage`.');
  }

  const elements = icuParser.parse(defaultMessage, {
    requiresOtherClause: true,
    shouldParseSkeletons: false,
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
            onMsgWithValuesExtracted(_, msgs) {
              msgs.map((msg) => {
                const newDefinition = { ...msg };
                const { id } = msg;
                extractedMessages.set(id, newDefinition);
              });
            },
          }),
          transformWithTs(ts, {
            additionalFunctionNames: ['translate'],
            extractSourceLocation: true,
            removeDefaultMessage: true,
            ast: true,
            onMsgExtracted(_, msgs) {
              msgs.map((msg) => {
                const { id } = msg;
                if (extractedMessages.has(id)) {
                  const existingMsg = extractedMessages.get(id);
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
