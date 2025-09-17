/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { discover, unifiedTabs, common } = getPageObjects(['discover', 'unifiedTabs', 'common']);
  const filterBar = getService('filterBar');
  const queryBar = getService('queryBar');
  const dataViews = getService('dataViews');
  const esql = getService('esql');
  const testSubjects = getService('testSubjects');

  // TODO: Implement tests
  describe('recently closed tabs', function () {
    it('should start with no recently closed tabs', async () => {});

    it('should update recently closed tabs after one of open tabs gets closed', async () => {});

    it('should update recently closed tabs after a new discover session is started', async () => {});
  });
}
