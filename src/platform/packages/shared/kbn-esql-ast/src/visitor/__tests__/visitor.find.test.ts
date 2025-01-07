/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../query';
import { Visitor } from '../visitor';

test('...', () => {
  const src = 'FROM index | WHERE a == b';
  const query = EsqlQuery.fromSrc(src);
  const index = 25;
  const char = src[index];
  const chain = Visitor.findNodeChainAtOrBefore(query.ast, index);
  query.ast.commands.forEach((cmd) => {
    const cmdSrc = src.slice(cmd.location.min, cmd.location.max + 1);
    console.log('cmdSrc: ', JSON.stringify(cmdSrc, null, 0));
  });
  console.log('char: ', char);
  console.log(
    JSON.stringify(
      chain.map(({ type, name }) => ({ type, name })),
      null,
      6
    )
  );
});
