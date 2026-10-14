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
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { act, render } from '@testing-library/react';
import type { Action } from '@kbn/ui-actions-plugin/public';

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

// Alias required so the jest.mock factory can reference useEffect without triggering
// Babel's hoisting guard (only `mock`-prefixed names are allowed inside factories).
const mockUseEffect = React.useEffect;

// Captures the onApiAvailable callback from the most-recently-rendered EmbeddableRenderer
// so tests can simulate the control API becoming available after mount.
let capturedOnApiAvailable: ((api: DefaultEmbeddableApi) => void) | undefined;

jest.mock('@kbn/embeddable-plugin/public', () => {
  const original = jest.requireActual('@kbn/embeddable-plugin/public');
  return {
    ...original,
    EmbeddableRenderer: ({ onApiAvailable, maybeId }: any) => {
      mockUseEffect(() => {
        capturedOnApiAvailable = onApiAvailable;
      }, []);
      return <div data-test-subj="mockEmbeddableRenderer">{maybeId}</div>;
    },
  };
});

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

/**
 * Waits for the mock EmbeddableRenderer's useEffect to capture onApiAvailable,
 * then calls it with the given api to simulate the control finishing its setup.
 */
const simulateApiAvailable = async (api: DefaultEmbeddableApi) => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1));
  });
  await act(async () => {
    capturedOnApiAvailable?.(api);
    await new Promise((resolve) => setTimeout(resolve, 1));
  });
};

const renderControlPanel = () =>
  render(
    <ControlPanel
      control={{
        ...DEFAULT_PINNED_CONTROL_STATE,
        id: 'control1',
        type: OPTIONS_LIST_CONTROL,
        order: 0,
      }}
      parentApi={parentApi}
      setControlPanelRef={jest.fn()}
    />
  );

describe('cancelRequests on unmount', () => {
  test('calls cancelRequests when the control API supports it', async () => {
    const cancelRequests = jest.fn();
    const mockApi = {
      uuid: 'control1',
      type: OPTIONS_LIST_CONTROL,
      cancelRequests,
    } as unknown as DefaultEmbeddableApi;

    const component = renderControlPanel();

    await simulateApiAvailable(mockApi);

    component.unmount();

    expect(cancelRequests).toHaveBeenCalledTimes(1);
  });

  test('does not throw when the control API does not support cancelRequests', async () => {
    const mockApi = {
      uuid: 'control1',
      type: OPTIONS_LIST_CONTROL,
    } as unknown as DefaultEmbeddableApi;
    expect((mockApi as any).cancelRequests).toBeUndefined();

    const component = renderControlPanel();

    await simulateApiAvailable(mockApi);

    expect(() => component.unmount()).not.toThrow();
  });

  test('does not throw when unmounted before the API is available', () => {
    const component = renderControlPanel();

    // Unmount before onApiAvailable is ever called (control still loading)
    expect(() => component.unmount()).not.toThrow();
  });
});
