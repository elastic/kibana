/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  ExtractDeps,
  extractPanelsReferences,
  InjectDeps,
  injectPanelsReferences,
} from './embeddable_references';
import { createEmbeddablePersistableStateServiceMock } from '../../../embeddable/common/mocks';
import { SavedDashboardPanel } from '../types';
import { EmbeddableStateWithType } from '../../../embeddable/common';

const embeddablePersistableStateService = createEmbeddablePersistableStateServiceMock();
const deps: InjectDeps & ExtractDeps = {
  embeddablePersistableStateService,
};

test('inject/extract panel references', () => {
  embeddablePersistableStateService.extract.mockImplementationOnce((state) => {
    const { HARDCODED_ID, ...restOfState } = (state as unknown) as Record<string, unknown>;
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
