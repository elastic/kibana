/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlServiceTestbed } from './testbed';

describe('EsqlService', () => {
  const testbed = new EsqlServiceTestbed();

  beforeAll(async () => {
    await testbed.start();
    await testbed.setupLookupIndices();
  });

  afterAll(async () => {
    await testbed.stop();
  });

  it('can load ES|QL Autocomplete/Validation indices for JOIN command', async () => {
    const url = '/internal/esql/autocomplete/join/indices';
    const result = await testbed.GET(url).send().expect(200);

    const item1 = result.body.indices.find((item: any) => item.name === 'lookup_index1');
    const item2 = result.body.indices.find((item: any) => item.name === 'lookup_index2');

    expect(item1).toMatchObject({
      name: 'lookup_index1',
      mode: 'lookup',
      aliases: [],
    });

    item2.aliases.sort();

    expect(item2).toMatchObject({
      name: 'lookup_index2',
      mode: 'lookup',
      aliases: ['lookup_index2_alias1', 'lookup_index2_alias2'],
    });
  });
});
