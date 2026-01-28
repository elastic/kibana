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

export default function ({ getPageObjects }: FtrProviderContext) {
  const { discover, common } = getPageObjects(['discover', 'common']);

  describe('Update query mode', () => {
    afterEach(async () => {
      await discover.resetQueryMode();
    });

    describe('when the user clicks ES|QL mode', () => {
      it('should set the default mode to ES|QL', async () => {
        await common.navigateToApp('discover');
        await discover.selectTextBaseLang();
        const queryMode = await discover.getQueryMode();
        expect(queryMode).to.contain('esql');
      });
    });

    describe('when the user clicks classic', () => {
      it('should set the default mode to classic', async () => {
        await common.navigateToApp('discover');
        await discover.selectTextBaseLang();
        await discover.selectDataViewMode();
        const queryMode = await discover.getQueryMode();
        expect(queryMode).to.contain('classic');
      });
    });
  });
}
