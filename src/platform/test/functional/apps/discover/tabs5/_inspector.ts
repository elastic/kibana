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

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { discover } = getPageObjects(['discover']);
  const inspector = getService('inspector');
  const testSubjects = getService('testSubjects');

  describe('inspect from tab menu', () => {
    afterEach(async () => {
      await inspector.close();
    });

    it('should open the inspector from the tab context menu', async () => {
      await discover.openInspectorFromTabMenu();
      const isOpen = await testSubjects.exists('inspectorPanel');
      expect(isOpen).to.be(true);
    });

    it('should display request stats in the inspector', async () => {
      await discover.openInspectorFromTabMenu();
      await testSubjects.click('inspectorRequestChooser');
      await testSubjects.click('inspectorRequestChooserDocuments');
      await testSubjects.click('inspectorRequestDetailStatistics');
      const requestStats = await inspector.getTableData();

      expect(requestStats.length).to.be.greaterThan(0);
    });
  });
}
