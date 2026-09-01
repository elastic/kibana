/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Serverless test (remove during Scout migration): x-pack/platform/test/serverless/functional/test_suites/examples/data_view_field_editor_example/data_view_field_editor_example.ts
import expect from '@kbn/expect';
import type { PluginFunctionalProviderContext } from '../../plugin_functional/services';

/**
 * Migration recommendation: DELETE. Field-editor flyout open/close and preconfigured `fieldToCreate`
 * (including name `demotestfield`) are covered in
 * src/platform/plugins/shared/data_view_field_editor/__jest__/client_integration/field_editor_flyout_content.test.ts
 * and public/plugin.test.tsx. Discover Scout already covers runtime-field CRUD
 * (src/platform/plugins/shared/discover/test/scout/core2/ui/parallel_tests/runtime_field_crud.spec.ts).
 */

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: PluginFunctionalProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const retry = getService('retry');
  const flyout = getService('flyout');

  describe('data_view_field_editor_example', () => {
    it('finds a data view', async () => {
      await testSubjects.existOrFail('dataViewTitle');
    });

    it('opens the field editor', async () => {
      await testSubjects.click('addField');
      await testSubjects.existOrFail('flyoutTitle');
      await retry.try(async () => {
        await flyout.closeFlyout();
        await testSubjects.missingOrFail('flyoutTitle');
      });
    });

    it('uses preconfigured options for a new field', async () => {
      // find the checkbox label and click it - `testSubjects.setCheckbox()` is not working for our checkbox
      const controlWrapper = await testSubjects.find('preconfiguredControlWrapper');
      const control = await find.descendantDisplayedByCssSelector('label', controlWrapper);
      await control.click();

      await testSubjects.click('addField');
      await testSubjects.existOrFail('flyoutTitle');

      const nameField = await testSubjects.find('nameField');
      const nameInput = await find.descendantDisplayedByCssSelector(
        '[data-test-subj=input]',
        nameField
      );

      expect(await nameInput.getAttribute('value')).to.equal('demotestfield');
    });
  });
}
