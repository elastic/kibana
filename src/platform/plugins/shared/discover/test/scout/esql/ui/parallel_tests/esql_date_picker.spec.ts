/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, tags } from '../fixtures';

spaceTest.describe('ES|QL date picker', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults({ loadFlightsDataView: true });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'esql' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'is enabled when the ES|QL query targets an index with a time field',
    async ({ pageObjects }) => {
      const { datePicker, discover } = pageObjects;

      // Explicitly submit to avoid the observability root profile overriding
      // the default query to a logs index pattern with no time field.
      await discover.writeAndSubmitEsqlQuery('from logstash-* | limit 10');

      await expect(datePicker.getDisabledDatePickerIndicator()).toBeHidden();
      await expect(datePicker.getTimePickerControl()).toBeVisible();
    }
  );

  spaceTest(
    'is disabled when the ES|QL query targets an index without a recognized time field',
    async ({ pageObjects }) => {
      const { datePicker, discover } = pageObjects;

      // kibana_sample_data_flights has a `timestamp` field but no `@timestamp`,
      // so the ES|QL ad-hoc data view has no timeFieldName → picker is disabled.
      await discover.writeAndSubmitEsqlQuery('from kibana_sample_data_flights | limit 10');

      await expect(datePicker.getDisabledDatePickerIndicator()).toBeVisible();
    }
  );
});
