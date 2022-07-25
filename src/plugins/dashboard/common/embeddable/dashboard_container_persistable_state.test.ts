/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createExtract, createInject } from './dashboard_container_persistable_state';
import { createEmbeddablePersistableStateServiceMock } from '@kbn/embeddable-plugin/common/mocks';
import { DashboardContainerStateWithType } from '../types';

const persistableStateService = createEmbeddablePersistableStateServiceMock();

const dashboardWithExtractedPanel: DashboardContainerStateWithType = {
  id: 'id',
  type: 'dashboard',
  panels: {
    panel_1: {
      type: 'panel_type',
      gridData: { w: 0, h: 0, x: 0, y: 0, i: '0' },
      panelRefName: 'panel_panel_1',
      explicitInput: {
        id: 'panel_1',
      },
    },
  },
};

const extractedSavedObjectPanelRef = {
  name: 'panel_1:panel_panel_1',
  type: 'panel_type',
  id: 'object-id',
};

const unextractedDashboardState: DashboardContainerStateWithType = {
  id: 'id',
  type: 'dashboard',
  panels: {
    panel_1: {
      type: 'panel_type',
      gridData: { w: 0, h: 0, x: 0, y: 0, i: '0' },
      explicitInput: {
        id: 'panel_1',
        savedObjectId: 'object-id',
      },
    },
  },
};

describe('inject/extract by reference panel', () => {
  it('should inject the extracted saved object panel', () => {
    const inject = createInject(persistableStateService);
    const references = [extractedSavedObjectPanelRef];

    const injected = inject(
      dashboardWithExtractedPanel,
      references
    ) as DashboardContainerStateWithType;

    expect(injected).toEqual(unextractedDashboardState);
  });

  it('should extract the saved object panel', () => {
    const extract = createExtract(persistableStateService);
    const { state: extractedState, references: extractedReferences } =
      extract(unextractedDashboardState);

    expect(extractedState).toEqual(dashboardWithExtractedPanel);
    expect(extractedReferences[0]).toEqual(extractedSavedObjectPanelRef);
  });
});

const dashboardWithExtractedByValuePanel: DashboardContainerStateWithType = {
  id: 'id',
  type: 'dashboard',
  panels: {
    panel_1: {
      type: 'panel_type',
      gridData: { w: 0, h: 0, x: 0, y: 0, i: '0' },
      explicitInput: {
        id: 'panel_1',
        extracted_reference: 'ref',
      },
    },
  },
};

const extractedByValueRef = {
  id: 'id',
  name: 'panel_1:ref',
  type: 'panel_type',
};

const unextractedDashboardByValueState: DashboardContainerStateWithType = {
  id: 'id',
  type: 'dashboard',
  panels: {
    panel_1: {
      type: 'panel_type',
      gridData: { w: 0, h: 0, x: 0, y: 0, i: '0' },
      explicitInput: {
        id: 'panel_1',
        value: 'id',
      },
    },
  },
};

describe('inject/extract by value panels', () => {
  it('should inject the extracted references', () => {
    const inject = createInject(persistableStateService);

    persistableStateService.inject.mockImplementationOnce((state, references) => {
      const ref = references.find((r) => r.name === 'ref');
      if (!ref) {
        return state;
      }

      if (('extracted_reference' in state) as any) {
        (state as any).value = ref.id;
        delete (state as any).extracted_reference;
      }

      return state;
    });

    const injectedState = inject(dashboardWithExtractedByValuePanel, [extractedByValueRef]);

    expect(injectedState).toEqual(unextractedDashboardByValueState);
  });

  it('should extract references using persistable state', () => {
    const extract = createExtract(persistableStateService);

    persistableStateService.extract.mockImplementationOnce((state) => {
      if ((state as any).value === 'id') {
        delete (state as any).value;
        (state as any).extracted_reference = 'ref';

        return {
          state,
          references: [{ id: extractedByValueRef.id, name: 'ref', type: extractedByValueRef.type }],
        };
      }

      return { state, references: [] };
    });

    const { state: extractedState, references: extractedReferences } = extract(
      unextractedDashboardByValueState
    );

    expect(extractedState).toEqual(dashboardWithExtractedByValuePanel);
    expect(extractedReferences).toEqual([extractedByValueRef]);
  });
});
