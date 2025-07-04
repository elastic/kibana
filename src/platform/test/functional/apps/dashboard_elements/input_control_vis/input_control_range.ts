/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const find = getService('find');

  const { visualize, visEditor, common } = getPageObjects(['visualize', 'visEditor', 'common']);

  describe('input control range', () => {
    before(async () => {
      await visualize.initTests();
      await common.navigateToApp('visualize');
      await visualize.loadSavedVisualization('input control range', {
        navigateToVisualize: false,
      });
    });

    it('should add filter', async () => {
      await visEditor.setFilterRange(0, '400', '999');
      await visEditor.inputControlSubmit();
      const controlFilters = await find.allByCssSelector('[data-test-subj^="filter"]');
      expect(controlFilters).to.have.length(1);
      expect(await controlFilters[0].getVisibleText()).to.equal('memory: 400 to 999');
    });
  });
}
