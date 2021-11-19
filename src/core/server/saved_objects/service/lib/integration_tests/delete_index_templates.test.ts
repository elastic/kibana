/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as kbnTestServer from '../../../../../test_helpers/kbn_server';
import { deleteIndexTemplates } from '../delete_index_templates';
import type { InternalCoreStart } from '../../../../internal_types';
import type { Root } from '../../../../root';

const { startES } = kbnTestServer.createTestServers({
  adjustTimeout: (t: number) => jest.setTimeout(t),
});

describe('deleteIndexTemplates', () => {
  let esServer: kbnTestServer.TestElasticsearchUtils;
  let root: Root;
  let start: InternalCoreStart;

  beforeAll(async () => {
    esServer = await startES();
    root = kbnTestServer.createRootWithCorePlugins({
      server: {
        basePath: '/hello',
      },
    });

    await root.preboot();
    await root.setup();
    start = await root.start();
  });

  afterAll(async () => {
    await esServer.stop();
    await root.shutdown();
  });

  it('does not fail when no templates match', async () => {
    const log = root.logger.get('');
    const client = start.elasticsearch.client.asInternalUser;

    await expect(deleteIndexTemplates({ log, client })).resolves.toBeDefined();
  });

  it('only deletes the `kibana_index_template*` templates', async () => {
    const log = root.logger.get('');
    const client = start.elasticsearch.client.asInternalUser;

    await client.indices.putTemplate({
      name: 'kibana_index_template:.kibana',
      create: true,
      body: { index_patterns: ['foo*'] },
    });
    await client.indices.putTemplate({
      name: 'another_template',
      create: true,
      body: { index_patterns: ['bar*'] },
    });

    await deleteIndexTemplates({ log, client });

    const { body: templates } = await client.indices.getTemplate({});

    const templateNames = Object.keys(templates);

    expect(templateNames.includes('kibana_index_template:.kibana')).toBe(false);
    expect(templateNames.includes('another_template')).toBe(true);
  });
});
