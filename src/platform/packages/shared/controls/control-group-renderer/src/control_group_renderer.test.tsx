/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import {
  registerReactEmbeddableFactory,
  type EmbeddableFactory,
} from '@kbn/embeddable-plugin/public/react_embeddable_system';
import type { Filter } from '@kbn/es-query';
import type { PublishesUnsavedChanges } from '@kbn/presentation-publishing';
import { act, render, waitFor } from '@testing-library/react';

import { BehaviorSubject } from 'rxjs';
import type { ControlGroupRendererApi, ControlPanelsState } from '.';
import type { ControlGroupRendererProps } from './control_group_renderer';
import { ControlGroupRenderer } from './control_group_renderer';

const mockServices = {
  services: {
    uiActions: {
      getTriggerCompatibleActions: jest.fn().mockResolvedValue([]),
      getFrequentlyChangingActionsForTrigger: jest.fn().mockResolvedValue([]),
      getTrigger: jest.fn().mockResolvedValue({}),
    },
  },
};

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn().mockImplementation(() => mockServices),
}));

const getTestEmbeddableFactory = () =>
  Promise.resolve({
    type: 'testControl',
    buildEmbeddable: async ({ initialState, finalizeApi }) => {
      const api = finalizeApi({
        serializeState: () => ({
          selection: initialState.selection,
        }),
      });
      return {
        Component: () => <div data-test-subj="testControl">{initialState.selection}</div>,
        api: {
          ...api,
          hasUnsavedChanges$: new BehaviorSubject(false),
          resetUnsavedChanges: jest.fn(),
        },
      };
    },
  } as EmbeddableFactory<{ selection?: string }>);

// defined in the outer scope so that its reference doesn't change on rerender
const mockGetCreationOptions = jest
  .fn()
  .mockResolvedValue({ initialState: { initialChildControlState: {} } });

describe('control group renderer', () => {
  beforeAll(() => {
    registerReactEmbeddableFactory('testControl', getTestEmbeddableFactory);
  });

  const mountControlGroupRenderer = async (
    props: Omit<ControlGroupRendererProps, 'onApiAvailable' | 'getCreationOptions'> & {
      getCreationOptions?: ControlGroupRendererProps['getCreationOptions'];
    }
  ) => {
    let controlGroupApi: ControlGroupRendererApi | undefined;
    const component = render(
      <ControlGroupRenderer
        getCreationOptions={mockGetCreationOptions}
        {...props}
        onApiAvailable={(newApi) => {
          controlGroupApi = newApi;
        }}
      />
    );
    await waitFor(() => {
      expect(controlGroupApi).toBeDefined();
    });
    return { component, api: controlGroupApi! as ControlGroupRendererApi };
  };

  test('calling `updateInput` forces each child to be reset', async () => {
    const { api } = await mountControlGroupRenderer({
      getCreationOptions: jest.fn().mockResolvedValue({
        initialState: {
          initialChildControlState: {
            test: {
              type: 'testControl',
            },
          },
        },
      }),
    });
    const resetSpy = jest.spyOn(
      api.children$.getValue().test as PublishesUnsavedChanges,
      'resetUnsavedChanges'
    );
    act(() =>
      api.updateInput({
        initialChildControlState: {
          test: {
            type: 'testControl',
            selection: 'test selection',
          },
        } as unknown as ControlPanelsState,
      })
    );

    expect(resetSpy).toBeCalledTimes(1);
  });

  test('filter changes are dispatched to control parent API if they are different', async () => {
    const initialFilters: Filter[] = [
      { meta: { alias: 'test', disabled: false, negate: false, index: 'test' } },
    ];
    const updatedFilters: Filter[] = [
      { meta: { alias: 'test', disabled: false, negate: true, index: 'test' } },
    ];

    const { component, api } = await mountControlGroupRenderer({ filters: initialFilters });
    expect(api.filters$?.getValue()).toEqual(initialFilters);
    component.rerender(
      <ControlGroupRenderer
        onApiAvailable={jest.fn()}
        getCreationOptions={mockGetCreationOptions}
        filters={updatedFilters}
      />
    );
    expect(api.filters$?.getValue()).toEqual(updatedFilters);
  });

  test('query changes are dispatched to control parent API if they are different', async () => {
    const initialQuery = { language: 'kql', query: 'query' };
    const updatedQuery = { language: 'kql', query: 'super query' };

    const { component, api } = await mountControlGroupRenderer({ query: initialQuery });
    expect(api.query$?.getValue()).toEqual(initialQuery);
    component.rerender(
      <ControlGroupRenderer
        onApiAvailable={jest.fn()}
        getCreationOptions={mockGetCreationOptions}
        query={updatedQuery}
      />
    );
    expect(api.query$?.getValue()).toEqual(updatedQuery);
  });

  test('time range changes are dispatched to control parent API if they are different', async () => {
    const initialTime = { from: new Date().toISOString(), to: new Date().toISOString() };
    const updatedTime = { from: new Date().toISOString() + 10, to: new Date().toISOString() + 20 };

    const { component, api } = await mountControlGroupRenderer({ timeRange: initialTime });
    expect(api.timeRange$?.getValue()).toEqual(initialTime);
    component.rerender(
      <ControlGroupRenderer
        onApiAvailable={jest.fn()}
        getCreationOptions={mockGetCreationOptions}
        timeRange={updatedTime}
      />
    );
    expect(api.timeRange$?.getValue()).toEqual(updatedTime);
  });
});
