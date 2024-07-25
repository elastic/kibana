/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAstAndSyntaxErrors } from '../ast_parser';
import { prettyPrintOneLine } from './pretty_print_one_line';

test('...', () => {
  const { ast } = getAstAndSyntaxErrors(
    'FROM index METADATA _id, asdf, 123 | STATS fn(1), a = b | LIMIT 1000'
  );
  console.log(JSON.stringify(ast, null, 2));

  const text = prettyPrintOneLine(ast);
  console.log(text);
});
