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

type BasicObjectProp = t.ObjectProperty & {
  key: t.StringLiteral;
};

const isBasicObjectProp = (n: t.Node): n is BasicObjectProp =>
  n.type === 'ObjectProperty' && n.key.type === 'StringLiteral';

const isManaged = (node?: t.Node) =>
  !!node?.leadingComments?.some(
    (c) => c.type === 'CommentLine' && c.value.trim().toLocaleLowerCase() === '@managed'
  );

const isSelfManaged = (node?: t.Node) => {
  const result = !!node?.leadingComments?.some(
    (c) => c.type === 'CommentLine' && c.value.trim().toLocaleLowerCase() === 'self managed'
  );

  // if we find a node which is both managed and self managed remove the managed comment
  if (result && node && isManaged(node)) {
    node.leadingComments =
      node.leadingComments?.filter((c) => c.value.trim() !== '@managed') ?? null;
  }

  return result;
};

const remove = <T>(arr: T[], value: T) => {
  const index = arr.indexOf(value);
  if (index > -1) {
    arr.splice(index, 1);
  }
};

const createManagedProp = (key: string, value: any) => {
  const childProp = t.objectProperty(t.stringLiteral(key), parseExpression(JSON.stringify(value)));
  t.addComment(childProp, 'leading', ' @managed', true);
  return childProp;
};

const createObjectPropOfManagedValues = (key: string, value: Record<string, any>) => {
  return t.objectProperty(
    t.stringLiteral(key),
    t.objectExpression(Object.entries(value).map(([k, v]) => createManagedProp(k, v)))
  );
};

/**
 * Adds a new setting to the settings.json file. Used when there is no existing key
 *
 * @param ast AST of the entire settings.json file
 * @param key the key name to add
 * @param value managed value which should be set at `key`
 */
const addManagedProp = (
  ast: t.ObjectExpression,
  key: string,
  value: string | Record<string, any> | boolean | number | any[]
) => {
  if (['number', 'string', 'boolean'].includes(typeof value) || Array.isArray(value)) {
    ast.properties.push(createManagedProp(key, value));
  } else {
    ast.properties.push(createObjectPropOfManagedValues(key, value as Record<string, any>));
  }
};

/**
 * Replace an existing setting in the settings.json file with the `managedValue`, ignoring its
 * type, used when the value of the existing setting is not an ObjectExpression
 *
 * @param ast AST of the entire settings.json file
 * @param existing node which should be replaced
 * @param value managed value which should replace the current value, regardless of its type
 */
const replaceManagedProp = (
  ast: t.ObjectExpression,
  existing: BasicObjectProp,
  value: string | Record<string, any> | boolean | number
) => {
  remove(ast.properties, existing);
  addManagedProp(ast, existing.key.value, value);
};

/**
 * Merge the managed value in to the value already in the settings.json file. Any property which is
 * labeled with a `// self managed` comment is untouched, any property which is `// @managed` but
 * no longer in the `managedValue` is removed, and any properties in the `managedValue` are either
 * added or updated based on their existence in the AST.
 *
 * @param properties Object expression properties list which we will merge with ("key": <value>)
 * @param managedValue the managed value that should be merged into the existing values
 */
const mergeManagedProperties = (
  properties: t.ObjectExpression['properties'],
  managedValue: Record<string, any>
) => {
  // iterate through all the keys in the managed `value` and either add them to the
  // prop, update their value, or ignore them because they are "// self managed"
  for (const [key, value] of Object.entries(managedValue)) {
    const existing = properties.filter(isBasicObjectProp).find((p) => p.key.value === key);

    if (!existing) {
      // add the new managed prop
      properties.push(createManagedProp(key, value));
      continue;
    }

    if (isSelfManaged(existing)) {
      continue;
    }

    if (isManaged(existing)) {
      // the prop already exists and is still managed, so update it's value
      existing.value = parseExpression(JSON.stringify(value));
      continue;
    }

    // take over the unmanaged child prop by deleting the previous prop and replacing it
    // with a brand new one
    remove(properties, existing);
    properties.push(createManagedProp(key, value));
  }

  // iterate through the props to find "// @managed" props which are no longer in
  // the `managedValue` and remove them
  for (const prop of properties) {
    if (
      isBasicObjectProp(prop) &&
      isManaged(prop) &&
      !Object.prototype.hasOwnProperty.call(managedValue, prop.key.value)
    ) {
      remove(properties, prop);
    }
  }
};

/**
 * Update the settings.json file used by VSCode in the Kibana repository. If the file starts
 * with the comment "// self managed" then it is not touched. If a top-level keys is prefixed with
 * `// self managed` then all the properties of that setting are left untouched. And finally, if
 * a specific child property of a setting like `search.exclude` is prefixed with `// self managed`
 * then it is left untouched.
 *
 * We don't just use `JSON.parse()` and `JSON.stringify()` in order to support this customization and
 * also to support users using comments in this file, which is very useful for temporarily disabling settings.
 *
 * After the config file is updated it is formatted with prettier.
 *
 * @param keys The config keys which are managed
 * @param infoText The text which should be written to the top of the file to educate users how to customize the settings
 * @param json The settings file as a string
 */
export function updateVscodeConfig(keys: ManagedConfigKey[], infoText: string, json?: string) {
  json = json || '{}';
  const ast = parseExpression(json);

  if (ast.type !== 'ObjectExpression') {
    throw new Error(`expected VSCode config to contain a JSON object`);
  }

  if (isSelfManaged(ast)) {
    return json;
  }

  for (const { key, value } of keys) {
    const existingProp = ast.properties.filter(isBasicObjectProp).find((p) => p.key.value === key);

    if (isSelfManaged(existingProp)) {
      continue;
    }

    if (Array.isArray(value)) {
      if (!existingProp) {
        addManagedProp(ast, key, value);
        continue;
      }

      if (!isSelfManaged(existingProp)) {
        replaceManagedProp(ast, existingProp, value);
        continue;
      }

      continue;
    }

    if (typeof value === 'object') {
      if (existingProp && existingProp.value.type === 'ObjectExpression') {
        // setting exists and is an object so merge properties of `value` with it
        mergeManagedProperties(existingProp.value.properties, value);
        continue;
      }

      if (existingProp) {
        // setting exists but its value is not an object expression so replace it
        replaceManagedProp(ast, existingProp, value);
        continue;
      }

      // setting isn't in config file so create it
      addManagedProp(ast, key, value);
      continue;
    }

    if (existingProp) {
      replaceManagedProp(ast, existingProp, value);
    } else {
      addManagedProp(ast, key, value);
    }
  }

  ast.leadingComments = [
    (infoText
      ? {
          type: 'CommentBlock',
          value: `*
 * @managed
 *
 * ${infoText.split(/\r?\n/).join('\n * ')}
`,
        }
      : {
          type: 'CommentLine',
          value: ' @managed',
        }) as t.CommentBlock,
    ...(ast.leadingComments ?? [])?.filter((c) => !c.value.includes('@managed')),
  ];

  return Prettier.format(generate(ast).code, {
    endOfLine: 'auto',
    filepath: 'settings.json',
  });
}
