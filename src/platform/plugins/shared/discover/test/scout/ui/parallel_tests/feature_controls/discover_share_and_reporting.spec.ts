/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import { decompressFromBase64 } from 'lz-string';
import { expect } from '@kbn/scout/ui';
import { DISCOVER_APP_LOCATOR } from '../../../../../common';
import { spaceTest, testData } from '../../fixtures/common';
import {
  DISCOVER_ALL_ROLE,
  DISCOVER_READ_ROLE,
  DISCOVER_READ_URL_CREATE_ROLE,
  FEATURE_CONTROLS_UI_TAG,
} from '../../fixtures/feature_controls/constants';

// Matching the `/app/r/s/` segment also tolerates the `/s/<space>` prefix
const isShortUrl = (url: string) => /\/app\/r\/s\//.test(new URL(url).pathname);

spaceTest.describe(
  'Discover feature controls — share and reporting',
  { tag: FEATURE_CONTROLS_UI_TAG },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest('discover:all gets a short share URL', async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginWithCustomRole(DISCOVER_ALL_ROLE);
      await pageObjects.discover.goto({ queryMode: 'classic' });

      const sharedUrl = await pageObjects.discover.getSharedUrl();
      await pageObjects.discover.closeShareModal();

      expect(isShortUrl(sharedUrl)).toBe(true);
    });

    spaceTest('discover:all can generate a CSV report', async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginWithCustomRole(DISCOVER_ALL_ROLE);
      await pageObjects.discover.goto({ queryMode: 'classic' });

      const download = await pageObjects.discover.exportAsCsv();
      expect(download.suggestedFilename()).toMatch(/\.csv$/);
    });

    spaceTest(
      'discover:read + url_create also gets a short share URL',
      async ({ browserAuth, pageObjects }) => {
        await browserAuth.loginWithCustomRole(DISCOVER_READ_URL_CREATE_ROLE);
        await pageObjects.discover.goto({ queryMode: 'classic' });

        const sharedUrl = await pageObjects.discover.getSharedUrl();
        await pageObjects.discover.closeShareModal();

        expect(isShortUrl(sharedUrl)).toBe(true);
      }
    );

    spaceTest(
      'discover:read without url_create only gets a long share URL',
      async ({ browserAuth, pageObjects }) => {
        await browserAuth.loginWithCustomRole(DISCOVER_READ_ROLE);
        await pageObjects.discover.goto({ queryMode: 'classic' });

        const sharedUrl = await pageObjects.discover.getSharedUrl();
        await pageObjects.discover.closeShareModal();

        expect(isShortUrl(sharedUrl)).toBe(false);
        expect(sharedUrl).toContain(DISCOVER_APP_LOCATOR);
      }
    );

    spaceTest(
      'discover:read snapshot URL encodes the current query, sort and time range',
      async ({ browserAuth, discoverScoutSpace, pageObjects }) => {
        await browserAuth.loginWithCustomRole(DISCOVER_READ_ROLE);
        await pageObjects.discover.goto({ queryMode: 'classic' });

        const sharedUrl = await pageObjects.discover.getSharedUrl();
        await pageObjects.discover.closeShareModal();

        expect(sharedUrl).toContain(`?l=${DISCOVER_APP_LOCATOR}`);

        const urlSearchParams = new URLSearchParams(sharedUrl);
        const lzPayload = urlSearchParams.get('lz');
        expect(lzPayload).not.toBeNull();
        const decompressed = decompressFromBase64(lzPayload!);
        expect(decompressed).not.toBeNull();
        const parsedSharedUrl = JSON.parse(decompressed!);

        expect(omit(parsedSharedUrl, 'tab')).toStrictEqual({
          query: {
            language: 'kuery',
            query: '',
          },
          sort: [['@timestamp', 'desc']],
          interval: 'auto',
          filters: [],
          dataViewId: discoverScoutSpace.getDataViewId(testData.DEFAULT_DATA_VIEW),
          timeRange: testData.DEFAULT_TIME_RANGE,
          refreshInterval: {
            value: 60000,
            pause: true,
          },
        });
        expect(typeof parsedSharedUrl.tab.id).toBe('string');
        expect(typeof parsedSharedUrl.tab.label).toBe('string');
      }
    );
  }
);
