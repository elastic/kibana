/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAstAndSyntaxErrors as parse } from '../ast_parser';

describe('FROM', () => {
  it('can parse basic FROM query', () => {
    const text = 'FROM kibana_ecommerce_data';
    const { ast } = parse(text);

    expect(ast).toMatchObject([
      {
        type: 'command',
        name: 'from',
        args: [
          {
            type: 'source',
            name: 'kibana_ecommerce_data',
            sourceType: 'index',
          },
        ],
      },
    ]);
  });

  it('can parse FROM query with metadata', () => {
    const text = 'from kibana_sample_data_ecommerce METADATA _index, \n _id\n';
    const { ast } = parse(text);

    expect(ast).toMatchObject([
      {
        type: 'command',
        name: 'from',
        args: [
          {
            type: 'source',
            name: 'kibana_sample_data_ecommerce',
            sourceType: 'index',
          },
          {
            type: 'option',
            name: 'metadata',
            args: [
              {
                type: 'column',
                name: '_index',
                quoted: false,
              },
              {
                type: 'column',
                name: '_id',
                quoted: false,
              },
            ],
          },
        ],
      },
    ]);
  });
});
