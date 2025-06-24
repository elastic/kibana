/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService }: PluginFunctionalProviderContext) {
  const browser = getService('browser');
  const deployment = getService('deployment');
  const testSubjects = getService('testSubjects');

  describe.skip('top nav', function describeIndexTests() {
    before(async () => {
      const url = `${deployment.getHostPort()}/app/kbn_tp_top_nav/`;
      await browser.get(url);
    });

    it('Shows registered menu items', async () => {
      const ownMenuItem = await testSubjects.find('demoNewButton');
      expect(await ownMenuItem.getVisibleText()).to.be('New Button');
      const demoRegisteredNewButton = await testSubjects.find('demoRegisteredNewButton');
      expect(await demoRegisteredNewButton.getVisibleText()).to.be('Registered Button');
    });
  });
}
