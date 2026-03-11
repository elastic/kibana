/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createEmbeddableSetupMock } from '@kbn/embeddable-plugin/server/mocks';
import { registerOptionsListControlTransforms } from './options_list_control_transforms';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';

const REF_NAME = 'test-data-view';

const baseState = {
  dataViewRefName: REF_NAME,
  field_name: 'test',
  title: 'Test',
};

const panelReferences = [{ name: REF_NAME, type: 'index-pattern', id: 'data-view-id' }];

const getTransformOut = () => {
  const embeddable = createEmbeddableSetupMock();
  registerOptionsListControlTransforms(embeddable);

  const [, transformsSetup] = embeddable.registerTransforms.mock.calls[0];
  const { transformOut } = transformsSetup.getTransforms!({} as DrilldownTransforms);
  return transformOut!;
};

describe('options list control transforms', () => {
  describe('transformOut', () => {
    const transformOut = getTransformOut();

    it('omits null values while keeping non-null values', () => {
      const result = transformOut(
        {
          ...baseState,
          exclude: true,
          sort: null,
          existsSelected: null,
          runPastTimeout: null,
          searchTechnique: 'prefix',
          selectedOptions: ['val'],
          singleSelect: null,
        },
        panelReferences,
        undefined,
        undefined
      );

      expect(result).toMatchInlineSnapshot(`
        Object {
          "data_view_id": "data-view-id",
          "exclude": true,
          "field_name": "test",
          "search_technique": "prefix",
          "selected_options": Array [
            "val",
          ],
          "title": "Test",
        }
      `);
    });
  });
});
