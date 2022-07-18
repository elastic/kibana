/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ExtractDeps,
  extractPanelsReferences,
  InjectDeps,
  injectPanelsReferences,
} from './embeddable_references';
import { createEmbeddablePersistableStateServiceMock } from '@kbn/embeddable-plugin/common/mocks';
import { SavedDashboardPanel } from '../types';
import { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';

const embeddablePersistableStateService = createEmbeddablePersistableStateServiceMock();
const deps: InjectDeps & ExtractDeps = {
  embeddablePersistableStateService,
};

test('inject/extract panel references', () => {
  embeddablePersistableStateService.extract.mockImplementationOnce((state) => {
    const { HARDCODED_ID, ...restOfState } = state as unknown as Record<string, unknown>;
    return {
      state: restOfState as EmbeddableStateWithType,
      references: [{ id: HARDCODED_ID as string, name: 'refName', type: 'type' }],
    };
  });

  embeddablePersistableStateService.inject.mockImplementationOnce((state, references) => {
    const ref = references.find((r) => r.name === 'refName');
    return {
      ...state,
      HARDCODED_ID: ref!.id,
    };
  });

  const savedDashboardPanel: SavedDashboardPanel = {
    type: 'search',
    embeddableConfig: {
      HARDCODED_ID: 'IMPORTANT_HARDCODED_ID',
    },
    id: 'savedObjectId',
    panelIndex: '123',
    gridData: {
      x: 0,
      y: 0,
      h: 15,
      w: 15,
      i: '123',
    },
    version: '7.0.0',
  };

  const [{ panel: extractedPanel, references }] = extractPanelsReferences(
    [savedDashboardPanel],
    deps
  );
  expect(extractedPanel.embeddableConfig).toEqual({});
  expect(references).toMatchInlineSnapshot(`
    Array [
      Object {
        "id": "IMPORTANT_HARDCODED_ID",
        "name": "refName",
        "type": "type",
      },
    ]
  `);

  const [injectedPanel] = injectPanelsReferences([extractedPanel], references, deps);

  expect(injectedPanel).toEqual(savedDashboardPanel);
});
