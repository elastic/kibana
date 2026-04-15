/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { discover, common, unifiedSearch } = getPageObjects([
    'discover',
    'common',
    'unifiedSearch',
  ]);

  describe('Default query mode', () => {
    afterEach(async () => {
      await discover.resetQueryMode();
    });

    describe('when there is no default query mode set', () => {
      it('should open Discover in ESQL mode', async () => {
        // Validate that no default query mode is set
        await common.navigateToApp('discover');
        const queryMode = await discover.getQueryMode();
        expect(queryMode).to.be(null);

        // Go to discover and validate ESQL mode
        await discover.isInEsqlMode();
      });
    });

    describe('when the user clicks ES|QL mode', () => {
      it('should set the default mode to ES|QL', async () => {
        // Go to discover and select ES|QL mode
        await common.navigateToApp('discover');
        await unifiedSearch.switchToDataViewMode();
        await discover.selectTextBaseLang();
        const queryMode = await discover.getQueryMode();
        expect(queryMode).to.contain('esql');

        // Reload the app and validate ES|QL mode is persisted
        await common.navigateToApp('discover', { path: '' });
        await discover.isInEsqlMode();
      });
    });

    describe('when the user clicks classic', () => {
      it('should set the default mode to classic', async () => {
        // Go to discover and select classic mode
        await common.navigateToApp('discover');
        await unifiedSearch.switchToDataViewMode();
        const queryMode = await discover.getQueryMode();
        expect(queryMode).to.contain('classic');

        // Reload the app and validate classic mode is persisted
        await common.navigateToApp('discover', { path: '' });
        await discover.isInClassicMode();
      });
    });
  });
}
