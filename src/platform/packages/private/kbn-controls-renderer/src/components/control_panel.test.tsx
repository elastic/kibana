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
import type { Action } from '@kbn/ui-actions-plugin/public';
import { render } from '@testing-library/react';

import type { ControlsRendererParentApi } from '../types';
import { ControlPanel } from './control_panel';

// Stub the async embeddable renderer: the width/grow assertions read classes that
// `ControlPanel` renders synchronously from props, independent of the renderer.
jest.mock('@kbn/embeddable-plugin/public', () => ({
  EmbeddableRenderer: () => null,
}));

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
  children$: new BehaviorSubject({}),
  registerChildApi: jest.fn(),
} as unknown as ControlsRendererParentApi;

describe('render', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('control width', () => {
    test('should use default medium class + default no flex grow', () => {
      const controlPanel = render(
        <ControlPanel
          control={{
            ...DEFAULT_PINNED_CONTROL_STATE,
            id: 'control1',
            type: 'options_list_control',
            order: 0,
          }}
          parentApi={parentApi}
          setControlPanelRef={jest.fn()}
        />
      );
      const controlFrame = controlPanel.getByTestId('control-frame');
      expect(controlFrame.getAttribute('class')).toContain('controlFrameWrapper--medium');
      expect(controlFrame.getAttribute('class')).toContain('euiFlexItem-growZero');
    });

    test('should use small class + flex grow', () => {
      const controlPanel = render(
        <ControlPanel
          control={{
            id: 'control1',
            type: 'options_list_control',
            order: 0,
            width: 'small',
            grow: true,
          }}
          parentApi={parentApi}
          setControlPanelRef={jest.fn()}
        />
      );
      const controlFrame = controlPanel.getByTestId('control-frame');
      expect(controlFrame.getAttribute('class')).toContain('controlFrameWrapper--small');
      expect(controlFrame.getAttribute('class')).toContain('euiFlexItem-grow');
    });
  });
});
