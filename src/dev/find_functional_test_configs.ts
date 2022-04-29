/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Fs from 'fs';
import * as Path from 'path';

import * as JsYaml from 'js-yaml';
import * as Babel from '@babel/core';
import * as T from '@babel/types';
import * as Rx from 'rxjs';
import { run } from '@kbn/dev-utils';
import { REPO_ROOT } from '@kbn/utils';
import execa from 'execa';

const readFile$ = Rx.bindNodeCallback(Fs.readFile);
const parse$ = (path: string, buffer: Buffer) => {
  return Rx.defer(async () => {
    const result = await Babel.parseAsync(buffer.toString('utf8'), {
      presets: [require.resolve('@kbn/babel-preset/node_preset')],
      filename: path,
      ast: true,
      code: false,
      babelrc: false,
    });

    return result?.program ? [result?.program] : [];
  }).pipe(Rx.mergeAll());
};

run(async ({ flags, log }) => {
  const paths$ = flags._.length
    ? Rx.from(flags._).pipe(Rx.map((i) => Path.resolve(i)))
    : Rx.defer(() =>
        execa('git', ['ls-files', 'test', 'x-pack/test'], {
          cwd: REPO_ROOT,
          buffer: true,
        })
      ).pipe(
        Rx.mergeMap((proc) => proc.stdout.split('\n')),
        Rx.map((l) => Path.resolve(REPO_ROOT, l.trim())),
        Rx.filter((p) => !!p && (p.endsWith('.js') || p.endsWith('.ts')))
      );

  const knownGroups: { disabled: string[]; enabled: string[] } = JsYaml.safeLoad(
    Fs.readFileSync(require.resolve('../../.buildkite/ftr_configs.yml'), 'utf8')
  );

  const knownPaths = knownGroups.enabled.map((p) => Path.resolve(REPO_ROOT, p));
  const disabledPaths = knownGroups.disabled.map((p) => Path.resolve(REPO_ROOT, p));
  const possible: string[] = [];
  const confirmed: string[] = [];

  await Rx.lastValueFrom(
    paths$.pipe(
      Rx.filter((p) => {
        if (knownPaths.includes(p)) {
          confirmed.push(p);
          return false;
        }

        return !disabledPaths.includes(p);
      }),
      Rx.mergeMap(
        (path) =>
          readFile$(path).pipe(
            Rx.mergeMap((buffer) => {
              if (!buffer.includes('\nexport default')) {
                return Rx.EMPTY;
              }

              return parse$(path, buffer);
            }),
            Rx.tap((ast) => {
              const dec = ast.body.find((n): n is T.ExportDefaultDeclaration =>
                T.isExportDefaultDeclaration(n)
              );

              if (!dec) {
                return;
              }

              if (
                T.isCallExpression(dec.declaration) &&
                T.isIdentifier(dec.declaration.callee) &&
                dec.declaration.callee.name === 'createTestConfig'
              ) {
                confirmed.push(path);
                return;
              }

              const func = dec.declaration;
              if (T.isObjectExpression(func)) {
                return;
              }

              if (!(T.isFunctionDeclaration(func) || T.isArrowFunctionExpression(func))) {
                possible.push(path);
                return;
              }

              const param = func.params[0];
              if (!param || func.params.length !== 1) {
                return;
              }

              const paramTypeName =
                param.typeAnnotation?.type === 'TSTypeAnnotation' &&
                param.typeAnnotation.typeAnnotation.type === 'TSTypeReference' &&
                param.typeAnnotation.typeAnnotation.typeName.type === 'Identifier' &&
                param.typeAnnotation.typeAnnotation.typeName.name;
              if (typeof paramTypeName === 'string') {
                if (paramTypeName === 'FtrConfigProviderContext') {
                  confirmed.push(path);
                  return;
                }
                if (paramTypeName === 'FtrProviderContext') {
                  return;
                }
              }

              if (T.isObjectPattern(param)) {
                const descructNames = param.properties.flatMap((p) =>
                  p.type === 'ObjectProperty' && p.key.type === 'Identifier' ? p.key.name : []
                );

                if (descructNames.includes('readConfigFile')) {
                  confirmed.push(path);
                  return;
                }

                if (
                  descructNames.includes('getService') ||
                  descructNames.includes('getPageObject') ||
                  descructNames.includes('getPageObjects') ||
                  descructNames.includes('loadTestFile')
                ) {
                  return;
                }
              }

              possible.push(path);
            })
          ),
        20
      )
    )
  );

  log.info('confirmed paths:');
  for (const path of confirmed.sort((a, b) => a.localeCompare(b))) {
    log.write(`  - ${Path.relative(REPO_ROOT, path)}`);
  }

  if (possible.length) {
    log.write('');
    log.write('');
    log.info('possible paths:');
    for (const path of possible) {
      log.write(`  - ${Path.relative(REPO_ROOT, path)}`);
    }
  }
});
