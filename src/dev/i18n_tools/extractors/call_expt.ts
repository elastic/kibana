/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Opts } from '@formatjs/ts-transformer';
import ts from 'typescript';
type TypeScript = typeof ts;

const MESSAGE_DESC_KEYS: Array<keyof MessageDescriptor> = [
  'id',
  'defaultMessage',
  'description',
  'ignoreTag',
];
import type { MessageDescriptor } from '../types';

export interface ExtractorOpts extends Opts {
  onMsgWithValuesExtracted: (filePath: string, msgs: MessageDescriptor[]) => void;
}

export type { MessageDescriptor };

/**
 * Check if node is `i18n.translate` node
 * @param node
 * @param sf
 */
function isMemberMethodI18nTranslateCall(typescript: TypeScript, node: ts.CallExpression) {
  const fnNames = new Set(['translate']);
  const method = node.expression;

  // Handle foo.formatMessage()
  if (typescript.isPropertyAccessExpression(method)) {
    return fnNames.has(method.name.text);
  }

  // Handle formatMessage()
  return typescript.isIdentifier(method) && fnNames.has(method.text);
}

/**
 * Check if node is `foo.bar.formatMessage` node
 * @param node
 * @param sf
 */
function isMemberMethodFormatMessageCall(typescript: TypeScript, node: ts.CallExpression) {
  const fnNames = new Set(['formatMessage']);
  const method = node.expression;

  // Handle foo.formatMessage()
  if (typescript.isPropertyAccessExpression(method)) {
    return fnNames.has(method.name.text);
  }

  // Handle formatMessage()
  return typescript.isIdentifier(method) && fnNames.has(method.text);
}

function updateDefaultMessageobject(
  typescript: TypeScript,
  factory: ts.NodeFactory,
  defaultMessageProp: ts.PropertyAssignment
) {
  if (typescript.isBinaryExpression(defaultMessageProp.initializer)) {
    const [result, isStatic] = evaluateStringConcat(typescript, defaultMessageProp.initializer);
    if (!isStatic) {
      throw new Error('Unexpected defaultMessage with runtime evaluated variables found.');
    }
    const stringLiteral = factory.createStringLiteral(result);
    return factory.createPropertyAssignment('defaultMessage', stringLiteral);
  }

  return defaultMessageProp;
}

function setAttributesInObject(
  typescript: TypeScript,
  factory: ts.NodeFactory,
  node: ts.ObjectLiteralExpression,
  msg: MessageDescriptor,
  ast?: boolean
) {
  const newProps = [
    factory.createPropertyAssignment('id', factory.createStringLiteral(msg.id)),
    factory.createPropertyAssignment('ignoreTag', factory.createTrue()),
  ];

  for (const prop of node.properties) {
    if (
      typescript.isPropertyAssignment(prop) &&
      typescript.isIdentifier(prop.name) &&
      MESSAGE_DESC_KEYS.includes(prop.name.text as keyof MessageDescriptor)
    ) {
      if (prop.name.escapedText === 'defaultMessage') {
        newProps.push(updateDefaultMessageobject(typescript, factory, prop));
      } else {
        newProps.push(prop);
      }
      continue;
    }
    if (typescript.isPropertyAssignment(prop)) {
      newProps.push(prop);
    }
  }
  return factory.createObjectLiteralExpression(factory.createNodeArray(newProps));
}

export function extractMessagesFromCallExpression(
  typescript: TypeScript,
  factory: ts.NodeFactory,
  node: ts.CallExpression,
  opts: ExtractorOpts = { onMsgWithValuesExtracted: () => {} },
  sf: ts.SourceFile
): ts.VisitResult<ts.CallExpression> {
  if (isMemberMethodFormatMessageCall(typescript, node)) {
    const [descriptorsObj, valuesObj, ...restArgs] = node.arguments;

    if (!valuesObj) {
      return node;
    }

    const msg = extractMessageDescriptor(typescript, descriptorsObj, opts, sf);
    if (!msg) {
      throw new Error('No message extracted from descriptor');
    }

    const valuesKeys = getObjectKeys(typescript, valuesObj);

    const hasValuesObject = valuesKeys.length > 0;
    if (restArgs.length) {
      throw new Error(
        'We do not support a 3rd argument for formatMessage, please use i18n.translate instead.'
      );
    }

    if (hasValuesObject) {
      opts.onMsgWithValuesExtracted(sf.fileName, [{ ...msg, valuesKeys, hasValuesObject }]);
    }
  } else if (isMemberMethodI18nTranslateCall(typescript, node)) {
    const [idArgumentNode, descriptorsObj, ...restArgs] = node.arguments;

    if (
      typescript.isStringLiteral(idArgumentNode) &&
      typescript.isObjectLiteralExpression(descriptorsObj)
    ) {
      const msg = extractMessageDescriptor(typescript, descriptorsObj, opts, sf);
      if (!msg) {
        return node;
      }

      const messageId: string = literalToObj(typescript, idArgumentNode) as string;
      if (msg.hasValuesObject || msg.ignoreTag) {
        opts.onMsgWithValuesExtracted(sf.fileName, [{ ...msg, id: messageId }]);
      }

      return factory.updateCallExpression(node, node.expression, node.typeArguments, [
        setAttributesInObject(
          ts,
          factory,
          descriptorsObj,
          {
            id: messageId,
          },
          opts.ast
        ),
        setAttributesInObject(
          ts,
          factory,
          descriptorsObj,
          {
            id: messageId,
          },
          opts.ast
        ),
        ...restArgs,
      ]);
    }
  }
  return node;
}

function getObjectKeys(
  typescript: TypeScript,
  node: ts.ObjectLiteralExpression | ts.Expression
): string[] {
  if (!typescript.isObjectLiteralExpression(node)) {
    throw new Error(`Expecting object literal expression. Got ${node}`);
  }

  const valuesKeys = node.properties.map((prop) => {
    if (typescript.isPropertyAssignment(prop) || typescript.isShorthandPropertyAssignment(prop)) {
      if (typescript.isIdentifier(prop.name)) {
        return prop.name.getText();
      }
    }
  });

  if (valuesKeys.some((valuesKey) => typeof valuesKey === 'undefined')) {
    throw new Error('Unexpected undefined value inside values.');
  }

  return valuesKeys as string[];
}

export function extractMessageDescriptor(
  typescript: TypeScript,
  node:
    | ts.ObjectLiteralExpression
    | ts.JsxOpeningElement
    | ts.JsxSelfClosingElement
    | ts.Expression,
  { overrideIdFn, extractSourceLocation, preserveWhitespace }: any,
  sf: ts.SourceFile
): MessageDescriptor | undefined {
  let properties:
    | ts.NodeArray<ts.ObjectLiteralElement>
    | ts.NodeArray<ts.JsxAttributeLike>
    | undefined;
  if (typescript.isObjectLiteralExpression(node)) {
    properties = node.properties;
  } else if (typescript.isJsxOpeningElement(node) || typescript.isJsxSelfClosingElement(node)) {
    properties = node.attributes.properties;
  }

  const msg: MessageDescriptor = { id: '' };
  if (!properties) {
    return;
  }

  properties.forEach((prop) => {
    const { name } = prop;

    const initializer: ts.Expression | ts.JsxExpression | undefined =
      typescript.isPropertyAssignment(prop) || typescript.isJsxAttribute(prop)
        ? prop.initializer
        : undefined;

    if (name && typescript.isIdentifier(name) && initializer) {
      // ignoreTag boolean
      if (
        initializer.kind === ts.SyntaxKind.TrueKeyword ||
        initializer.kind === ts.SyntaxKind.FalseKeyword
      ) {
        switch (name.text) {
          case 'ignoreTag': {
            msg.ignoreTag = initializer.kind === ts.SyntaxKind.TrueKeyword;
            break;
          }
        }
      }
      // values object
      else if (ts.isObjectLiteralExpression(initializer)) {
        msg.hasValuesObject = true;
        const valuesKeys = getObjectKeys(typescript, initializer);
        msg.valuesKeys = valuesKeys as string[];
      } else if (ts.isStringLiteral(initializer)) {
        switch (name.text) {
          case 'id':
            msg.id = initializer.text;
            break;
          case 'defaultMessage':
            msg.defaultMessage = initializer.text;
            break;
          case 'description':
            msg.description = initializer.text;
            break;
        }
      }
      // message binary 'a' + `b` + ...
      else if (typescript.isBinaryExpression(initializer)) {
        const [result, isStatic] = evaluateStringConcat(typescript, initializer);
        if (isStatic) {
          switch (name.text) {
            case 'id':
              msg.id = result;
              break;
            case 'defaultMessage':
              msg.defaultMessage = result;
              break;
            case 'description':
              msg.description = result;
              break;
          }
        }
      }
      // {id: `id`}
      else if (typescript.isNoSubstitutionTemplateLiteral(initializer)) {
        switch (name.text) {
          case 'id':
            msg.id = initializer.text;
            break;
          case 'defaultMessage':
            msg.defaultMessage = initializer.text;
            break;
          case 'description':
            msg.description = initializer.text;
            break;
        }
      } else if (typescript.isJsxExpression(initializer) && initializer.expression) {
        // <FormattedMessage foo={'barbaz'} />
        if (typescript.isStringLiteral(initializer.expression)) {
          switch (name.text) {
            case 'id':
              msg.id = initializer.expression.text;
              break;
            case 'defaultMessage':
              msg.defaultMessage = initializer.expression.text;
              break;
            case 'description':
              msg.description = initializer.expression.text;
              break;
          }
        }
        // description={{custom: 1}}
        else if (
          typescript.isObjectLiteralExpression(initializer.expression) &&
          name.text === 'description'
        ) {
          msg.description = objectLiteralExpressionToObj(typescript, initializer.expression);
        } else if (
          typescript.isObjectLiteralExpression(initializer.expression) &&
          name.text === 'values'
        ) {
          msg.hasValuesObject = true;
          const valuesKeys = getObjectKeys(typescript, initializer.expression);
          msg.valuesKeys = valuesKeys as string[];
        }
        // <FormattedMessage foo={`bar`} />
        else if (typescript.isNoSubstitutionTemplateLiteral(initializer.expression)) {
          const { expression } = initializer;
          switch (name.text) {
            case 'id':
              msg.id = expression.text;
              break;
            case 'defaultMessage':
              msg.defaultMessage = expression.text;
              break;
            case 'description':
              msg.description = expression.text;
              break;
          }
        }
        // <FormattedMessage foo={'bar' + 'baz'} />
        else if (typescript.isBinaryExpression(initializer.expression)) {
          const { expression } = initializer;
          const [result, isStatic] = evaluateStringConcat(typescript, expression);
          if (isStatic) {
            switch (name.text) {
              case 'id':
                msg.id = result;
                break;
              case 'defaultMessage':
                msg.defaultMessage = result;
                break;
              case 'description':
                msg.description = result;
                break;
            }
          }
        }
      }
      // {defaultMessage: 'asd' + bar'}
      else if (typescript.isBinaryExpression(initializer)) {
        const [result, isStatic] = evaluateStringConcat(typescript, initializer);
        if (isStatic) {
          switch (name.text) {
            case 'id':
              msg.id = result;
              break;
            case 'defaultMessage':
              msg.defaultMessage = result;
              break;
            case 'description':
              msg.description = result;
              break;
          }
        }
      }
      // description: {custom: 1}
      else if (typescript.isObjectLiteralExpression(initializer) && name.text === 'description') {
        msg.description = objectLiteralExpressionToObj(typescript, initializer);
      }
    } else if (name && typescript.isIdentifier(name) && !initializer) {
      // <FormattedMessage ignoreTag />
      if (typescript.isJsxAttribute(prop)) {
        switch (name.text) {
          case 'ignoreTag': {
            msg.ignoreTag = true;
            break;
          }
        }
      }
    }
  });
  // We extracted nothing
  if (!msg.defaultMessage && !msg.id) {
    return;
  }

  if (extractSourceLocation) {
    return {
      ...msg,
      file: sf.fileName,
      start: node.pos,
      end: node.end,
    };
  }
  return msg;
}

function objectLiteralExpressionToObj(
  typescript: TypeScript,
  obj: ts.ObjectLiteralExpression
): object {
  return obj.properties.reduce((all: Record<string, any>, prop) => {
    if (typescript.isPropertyAssignment(prop) && prop.name) {
      if (typescript.isIdentifier(prop.name)) {
        all[prop.name.escapedText.toString()] = literalToObj(ts, prop.initializer);
      } else if (typescript.isStringLiteral(prop.name)) {
        all[prop.name.text] = literalToObj(ts, prop.initializer);
      }
    }
    return all;
  }, {});
}

function literalToObj(typescript: TypeScript, n: ts.Node) {
  if (typescript.isNumericLiteral(n)) {
    return +n.text;
  }
  if (typescript.isStringLiteral(n)) {
    return n.text;
  }
  if (n.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (n.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
}

function evaluateStringConcat(
  typescript: TypeScript,
  node: ts.BinaryExpression
): [result: string, isStaticallyEvaluatable: boolean] {
  const { right, left } = node;
  if (!typescript.isStringLiteral(right) && !typescript.isNoSubstitutionTemplateLiteral(right)) {
    return ['', false];
  }
  if (typescript.isStringLiteral(left) || typescript.isNoSubstitutionTemplateLiteral(left)) {
    return [left.text + right.text, true];
  }
  if (typescript.isBinaryExpression(left)) {
    const [result, isStatic] = evaluateStringConcat(typescript, left);
    return [result + right.text, isStatic];
  }
  return ['', false];
}
