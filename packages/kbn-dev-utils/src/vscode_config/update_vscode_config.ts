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

type ManagedPropAst = t.ObjectProperty & {
  key: t.StringLiteral;
  value: t.ObjectExpression;
};

type ManagedPropProp = t.ObjectProperty & {
  key: t.StringLiteral;
};

const isSelfManaged = (node?: t.Node) =>
  !!node?.leadingComments?.some(
    (c) => c.type === 'CommentLine' && c.value.trim().toLocaleLowerCase() === 'self managed'
  );

const remove = <T>(arr: T[], value: T) => {
  const index = arr.indexOf(value);
  if (index > -1) {
    arr.splice(index, 1);
  }
};

const createManagedChildProp = (key: string, value: any) => {
  const childProp = t.objectProperty(t.stringLiteral(key), parseExpression(JSON.stringify(value)));
  t.addComment(childProp, 'leading', ' @managed', true);
  return childProp;
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
    const existingProp = ast.properties.find(
      (p): p is ManagedPropAst =>
        p.type === 'ObjectProperty' &&
        p.key.type === 'StringLiteral' &&
        p.key.value === key &&
        p.value.type === 'ObjectExpression'
    );

    if (isSelfManaged(existingProp)) {
      continue;
    }

    // setting isn't in config file so create it and attach `@managed` comments to each property
    if (!existingProp) {
      ast.properties.push(
        t.objectProperty(
          t.stringLiteral(key),
          t.objectExpression(Object.entries(value).map(([k, v]) => createManagedChildProp(k, v)))
        )
      );
      continue;
    }

    // discover all the managed child props so that we can keep track of which props we need to delete
    // because they are no longer managed
    const existingManagedChildProps = new Map(
      existingProp.value.properties
        .filter(
          (n): n is ManagedPropProp =>
            n.type === 'ObjectProperty' &&
            n.key.type === 'StringLiteral' &&
            !!n.leadingComments?.some((c) => c.value.trim() === '@managed')
        )
        .map((n) => {
          return [n.key.value, n];
        })
    );

    // iterate through all the keys in the managed `value` and either add them to the
    // prop, update their value, or ignore them because they are "// self managed"
    for (const [k, v] of Object.entries(value)) {
      const managedChildProp = existingManagedChildProps.get(k);

      if (managedChildProp) {
        // the prop already exists and is still managed, so update it's value
        managedChildProp.value = parseExpression(JSON.stringify(v));
        // delete it from the existing map so that we don't delete it later
        existingManagedChildProps.delete(k);
        continue;
      }

      // find existing child props with the same key so we can detect if it's self managed
      const unmanagedChildProp = existingProp.value.properties.find(
        (p) => p.type === 'ObjectProperty' && p.key.type === 'StringLiteral' && p.key.value === k
      );

      if (unmanagedChildProp && isSelfManaged(unmanagedChildProp)) {
        // ignore this key in `value` because it already exists and is "// self managed"
        continue;
      }

      // take over the unmanaged child prop by deleting the previous prop and replacing it
      // with a brand new one
      if (unmanagedChildProp) {
        remove(existingProp.value.properties, unmanagedChildProp);
      }

      // add the new managed prop
      existingProp.value.properties.push(createManagedChildProp(k, v));
    }

    // iterate through the remaining managed props which weren't updated and delete them, they
    // were managed but are no longer managed
    for (const oldPropProp of existingManagedChildProps.values()) {
      remove(existingProp.value.properties, oldPropProp);
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
