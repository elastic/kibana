/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

/**
 * Migration recommendation: MIXED. Move input update and cancel behavior to the field-editor
 * Jest integration surface. Keep the one- and two-field reload-persistence scenarios in Scout
 * because they validate saved data-view metadata through a real application reload.
 */
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const log = getService('log');
  const PageObjects = getPageObjects(['settings', 'common']);

  describe('index result popularity', function describeIndexTests() {
    const fieldName = 'geo.coordinates';
    before(async function () {
      // delete .kibana index and then wait for Kibana to re-create it
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.navigateTo();
    });

    beforeEach(async () => {
      await PageObjects.settings.createIndexPattern('logstash-*');
      // increase Popularity of geo.coordinates
      log.debug('Starting openControlsByName (' + fieldName + ')');
      await PageObjects.settings.openControlsByName(fieldName);
      log.debug('increasePopularity');
      await testSubjects.click('toggleAdvancedSetting');
      await PageObjects.settings.increasePopularity();
    });

    afterEach(async () => {
      await PageObjects.settings.closeIndexPatternFieldEditor();
      await PageObjects.settings.removeIndexPattern();
      // Cancel saving the popularity change (we didn't make a change in this case, just checking the value)
    });

    /**
     * Migration recommendation: MIGRATE TO JEST. This only writes the popularity input and reads
     * it back. Extend data_view_field_editor/__jest__/client_integration/
     * field_editor_flyout_content.test.ts with the zero-to-one input-update assertion.
     */
    it('should update the popularity input', async function () {
      const popularity = await PageObjects.settings.getPopularity();
      log.debug('popularity = ' + popularity);
      expect(popularity).to.be('1');
    });

    /**
     * Migration recommendation: MIGRATE TO JEST. Cancelling a field-editor change is local form
     * state; add it to data_view_field_editor/__jest__/client_integration/
     * field_editor_flyout_content.test.ts with its existing editor helpers.
     */
    it('should be reset on cancel', async function () {
      // Cancel saving the popularity change
      await PageObjects.settings.closeIndexPatternFieldEditor();
      await PageObjects.settings.openControlsByName(fieldName);
      // check that it is 0 (previous increase was cancelled
      const popularity = await PageObjects.settings.getPopularity();
      log.debug('popularity = ' + popularity);
      expect(popularity).to.be('0');
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT. Saving popularity and recovering it after a
     * full reload verifies persisted data-view metadata through the real application.
     */
    it('can be saved', async function () {
      // Saving the popularity change
      await PageObjects.settings.controlChangeSave();
      await browser.refresh();
      await PageObjects.settings.openControlsByName(fieldName);
      const popularity = await PageObjects.settings.getPopularity();
      log.debug('popularity = ' + popularity);
      expect(popularity).to.be('1');
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT. This saves popularity for two fields, reloads
     * Kibana, and verifies both persisted values independently. A model test, or the single-field
     * reload scenario above, cannot catch one saved field overwriting the other's persisted value.
     */
    it('changing popularity for one field does not affect the other', async function () {
      expect(await PageObjects.settings.getPopularity()).to.be('1');
      await PageObjects.settings.setPopularity(5);
      await PageObjects.settings.controlChangeSave();

      await PageObjects.settings.openControlsByName('bytes');
      expect(await PageObjects.settings.getPopularity()).to.be('0');
      await testSubjects.click('toggleAdvancedSetting');
      await PageObjects.settings.setPopularity(7);
      await PageObjects.settings.controlChangeSave();

      await browser.refresh();

      await PageObjects.settings.openControlsByName('geo.coordinates');
      expect(await PageObjects.settings.getPopularity()).to.be('5');
      await PageObjects.settings.closeIndexPatternFieldEditor();
      await PageObjects.settings.openControlsByName('bytes');
      expect(await PageObjects.settings.getPopularity()).to.be('7');
    });
  }); // end 'change popularity'
}
