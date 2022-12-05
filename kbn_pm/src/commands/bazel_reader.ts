/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import execa from 'execa';
import Path from 'path';

import * as Ast from './ast_types';

const PARSER_DIR = Path.resolve(process.env.HOME ?? __dirname, 'dev/starlark-cli');

export async function parseBazelFiles(paths: string[]) {
  const proc = execa('go', ['run', '.'], {
    cwd: PARSER_DIR,
    input: JSON.stringify(paths),
  });

  let output = '';
  for await (const chunk of proc.stdout!) {
    output += chunk;
  }

  const results = JSON.parse(output);

  return new Map(
    paths.map((p) => {
      const result = results[p];
      if (!Ast.isFile(result)) {
        throw new Error(`result of parsing [${p}] is not a valid file`);
      }
      return [p, result] as const;
    })
  );
}
