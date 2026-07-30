/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * ES|QL requests surfaced in the Inspector. The slow-query variant lives in
 * `esql_view_inspector_slow_query.spec.ts` (stateful-only, as it relies on
 * the ES `error_query` test feature).
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../fixtures';
import { testData } from '../../../fixtures/common';
import {
  getInspectorRequestCommand,
  hasInspectorRequest,
  normalizeInspectorCommand,
  switchToRequestsView,
} from '../../../fixtures/esql/inspector_helpers';

const AGG_QUERY = 'from logstash-* | sort @timestamp';

spaceTest.describe('Discover ES|QL view - inspector', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'esql' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('shows Discover and Lens requests in the inspector', async ({ page, pageObjects }) => {
    const { discover } = pageObjects;

    await discover.codeEditor.setCodeEditorValue(AGG_QUERY);
    await discover.submitQuery();
    await discover.waitUntilTabIsLoaded();
    await discover.waitForHistogramRendered();
    await discover.openInspectorFromTabMenu();
    await switchToRequestsView(page);

    await expect.poll(() => hasInspectorRequest(page, 'Table')).toBe(true);
    await expect.poll(() => hasInspectorRequest(page, 'Visualization')).toBe(true);

    // Verify the Table request is routed to the async ES|QL endpoint.
    const command = await getInspectorRequestCommand(page, 'Table');
    expect(normalizeInspectorCommand(command)).toBe('POST /_query/async?drop_null_columns=true');
  });
});
