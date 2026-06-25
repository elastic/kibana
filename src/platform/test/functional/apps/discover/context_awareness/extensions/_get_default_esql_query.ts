/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { common, discover } = getPageObjects(['common', 'discover']);
  const esql = getService('esql');

  describe('extension getDefaultEsqlQuery', () => {
    afterEach(async () => {
      await discover.resetQueryMode();
    });

    it('should apply the root profile default query when ES|QL mode is the default', async () => {
      await common.navigateToApp('discover');
      await discover.waitUntilTabIsLoaded();
      await discover.isInClassicMode();
      await discover.setQueryMode('esql');
      await common.navigateToApp('discover', { path: '' });
      await discover.waitUntilTabIsLoaded();
      await discover.isInEsqlMode();

      expect(await esql.getEsqlEditorQuery()).to.be('FROM my-example-* | LIMIT 10');
    });
  });
}
