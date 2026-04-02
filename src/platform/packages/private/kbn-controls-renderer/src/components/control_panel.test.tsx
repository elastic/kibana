/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';

import { OPTIONS_LIST_CONTROL, DEFAULT_PINNED_CONTROL_STATE } from '@kbn/controls-constants';
import {
  registerReactEmbeddableFactory,
  type EmbeddableFactory,
} from '@kbn/embeddable-plugin/public/react_embeddable_system';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { render, waitFor } from '@testing-library/react';

import type { ControlsRendererParentApi } from '../types';
import { ControlPanel } from './control_panel';

const mockServices = {
  services: {
    uiActions: {
      getTriggerCompatibleActions: jest.fn().mockResolvedValue([
        {
          isCompatible: jest.fn().mockResolvedValue(true),
          id: 'testAction',
          MenuItem: () => <div>test1</div>,
        },
      ] as unknown as Action[]),
      getFrequentlyChangingActionsForTrigger: jest.fn().mockResolvedValue([]),
      getTrigger: jest.fn().mockResolvedValue({}),
    },
  },
};

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn().mockImplementation(() => mockServices),
}));

const parentApi = {
  getSerializedStateForChild: jest.fn().mockReturnValue({ type: OPTIONS_LIST_CONTROL }),
  viewMode$: new BehaviorSubject('view'),
  registerChildApi: jest.fn(),
} as unknown as ControlsRendererParentApi;

const mockOptionsListFactory: EmbeddableFactory<{ type: typeof OPTIONS_LIST_CONTROL }> = {
  type: OPTIONS_LIST_CONTROL,
  buildEmbeddable: async ({ initialState, finalizeApi }) => {
    const api = finalizeApi({
      parentApi,
      serializeState: () => ({
        type: OPTIONS_LIST_CONTROL,
      }),
      applySerializedState: () => undefined,
    });
    return {
      Component: () => <div data-test-subj="optionsListControl">Options list control</div>,
      api,
    };
  },
};

describe('render', () => {
  beforeAll(() => {
    registerReactEmbeddableFactory(
      'optionsListControl',
      jest.fn().mockResolvedValue(mockOptionsListFactory)
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('control width', () => {
    test('should use default medium class + default no flex grow', async () => {
      const controlPanel = render(
        <ControlPanel
          control={{
            ...DEFAULT_PINNED_CONTROL_STATE,
            uid: 'control1',
            type: 'optionsListControl',
            order: 0,
          }}
          parentApi={parentApi}
          setControlPanelRef={jest.fn()}
        />
      );
      await waitFor(() => {
        const controlFrame = controlPanel.getByTestId('control-frame');
        expect(controlFrame.getAttribute('class')).toContain('controlFrameWrapper--medium');
        expect(controlFrame.getAttribute('class')).toContain('euiFlexItem-growZero');
      });
    });

    test('should use small class + flex grow', async () => {
      const controlPanel = render(
        <ControlPanel
          control={{
            uid: 'control1',
            type: 'optionsListControl',
            order: 0,
            width: 'small',
            grow: true,
          }}
          parentApi={parentApi}
          setControlPanelRef={jest.fn()}
        />
      );
      await waitFor(() => {
        const controlFrame = controlPanel.getByTestId('control-frame');
        expect(controlFrame.getAttribute('class')).toContain('controlFrameWrapper--small');
        expect(controlFrame.getAttribute('class')).toContain('euiFlexItem-grow');
      });
    });
  });
});
