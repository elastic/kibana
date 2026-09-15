/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { expectRequestNames, spaceTest, tags } from '../fixtures';

spaceTest.describe('Discover ES|QL inspector', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'esql' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('lists the Table and Visualization requests', async ({ pageObjects }) => {
    const { discover, inspector, unifiedTabs } = pageObjects;

    // Submit explicitly rather than relying on the query Discover opens with: the
    // observability root profile overrides that default to `FROM <allLogsIndexPattern>`,
    // so the requests below would not be logstash's.
    await discover.writeAndSubmitEsqlQuery('from logstash-* | limit 10');

    await expectRequestNames({ inspector, unifiedTabs }, ['Table', 'Visualization']);

    await inspector.requests.requestTab.click();
    const request = await discover.codeEditor.getCodeEditorValueByTestSubj(
      'inspectorRequestCodeViewerContainer'
    );
    expect(request).toContain('POST /_query/async?drop_null_columns=true');
  });
});
