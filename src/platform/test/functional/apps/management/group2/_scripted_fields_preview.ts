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
 * Migration recommendation: MIGRATE TO JEST. All three cases check how the scripting help
 * flyout's "Preview results" tab (field_editor/components/scripting_help/test_script.tsx) renders
 * an executeScript() response. That component has no Jest test yet. Add test_script.test.tsx that
 * passes a mocked executeScript and asserts (1) the error body is shown for a non-200 response,
 * (2) the hits JSON is shown for a success, and (3) selected additional fields are sent as
 * `additionalFields`. The server side of /internal/index-pattern-management/preview_scripted_field,
 * including optional additionalFields, is covered by server/routes/preview_scripted_field.test.ts.
 * Real Elasticsearch execution through that route stays covered by the Scout migration of
 * "should not allow saving of invalid scripts" in _scripted_fields.ts. The before hook creates the
 * logstash data view through the UI only as setup, which group1 already covers.
 */
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const PageObjects = getPageObjects(['settings']);
  const SCRIPTED_FIELD_NAME = 'myScriptedField';

  const scriptResultToJson = (scriptResult: string) => {
    try {
      return JSON.parse(scriptResult);
    } catch (e) {
      expect().fail(`Could JSON.parse script result: "${scriptResult}"`);
    }
  };

  describe('scripted fields preview', () => {
    before(async function () {
      await browser.setWindowSize(1200, 800);
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
      await PageObjects.settings.createIndexPattern('logstash-*');
      // createIndexPattern lands on the data view detail page; open the scripted field form directly.
      await PageObjects.settings.goToAddScriptedField();
      await PageObjects.settings.setScriptedFieldName(SCRIPTED_FIELD_NAME);
    });

    after(async function afterAll() {
      await PageObjects.settings.navigateToDataViews();
      await PageObjects.settings.removeLogstashIndexPatternIfExist();
    });

    it('should display script error when script is invalid', async function () {
      const scriptResults = await PageObjects.settings.executeScriptedField(
        `i n v a l i d  s c r i p t`
      );
      expect(scriptResults).to.contain('search_phase_execution_exception');
    });

    it('should display script results when script is valid', async function () {
      const scriptResults = await PageObjects.settings.executeScriptedField(
        `doc['bytes'].value * 2`
      );
      const [
        {
          _id,
          [SCRIPTED_FIELD_NAME]: { [0]: scriptedField },
        },
      ] = scriptResultToJson(scriptResults);
      expect(_id).to.be.a('string');
      expect(scriptedField).to.be.a('number');
      expect(scriptedField).to.match(/[0-9]+/);
    });

    it('should display additional fields', async function () {
      const scriptResults = await PageObjects.settings.executeScriptedField(
        `doc['bytes'].value * 2`,
        'bytes'
      );
      const [{ _id, bytes }] = scriptResultToJson(scriptResults);
      expect(_id).to.be.a('string');
      expect(bytes).to.be.a('number');
    });
  });
}
