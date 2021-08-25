/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parseExpression } from '@babel/parser';
import * as t from '@babel/types';
import generate from '@babel/generator';
import Prettier from 'prettier';

import { ManagedConfigKey } from './managed_config_keys';

/**
 * Update the settings.json file used by VSCode in the Kibana repository. If the file starts
 * with the comment "// SELF MANAGED" then it is not touched. Otherwise managed settings are
 * overwritten in the file. We don't just use `JSON.parse()` and `JSON.stringify()` in order
 * to maintain comments. After the config file is updated it is formatted with prettier.
 *
 * @param json The settings file as a string
 */
export function updateVscodeConfig(keys: ManagedConfigKey[], json?: string) {
  if (json?.trim().startsWith('// SELF MANAGED')) {
    return json;
  }

  const ast = parseExpression(json || '{}');

  if (ast.type !== 'ObjectExpression') {
    throw new Error(`expected VSCode config to contain a JSON object`);
  }

  const commentText = `*
 * @managed
 *
 * The following keys in this file are managed by @kbn/dev-utils:
 *   - ${keys.map((k) => k.key).join('\n *   - ')}
 *
 * To disable this place the text "// SELF MANAGED" at the top of this file.
`;

  ast.leadingComments = [
    {
      type: 'CommentBlock',
      value: commentText,
    } as t.CommentBlock,
    ...(ast.leadingComments ?? [])?.filter((c) => !c.value.includes('@managed')),
  ];

  for (const { key, value } of keys) {
    const valueAst = parseExpression(JSON.stringify(value));
    const existing = ast.properties.find(
      (p): p is t.ObjectProperty =>
        p.type === 'ObjectProperty' && p.key.type === 'StringLiteral' && p.key.value === key
    );

    if (existing) {
      existing.value = valueAst;
    } else {
      ast.properties.push(t.objectProperty(t.stringLiteral(key), valueAst));
    }
  }

  return Prettier.format(generate(ast).code, {
    endOfLine: 'auto',
    filepath: 'settings.json',
  });
}
