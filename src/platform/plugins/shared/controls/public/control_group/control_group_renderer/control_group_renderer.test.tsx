/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { Filter } from '@kbn/es-query';
import { PublishesUnifiedSearch, PublishingSubject } from '@kbn/presentation-publishing';
import { act, render, waitFor } from '@testing-library/react';

import { ControlGroupRendererApi } from '.';
import { CONTROL_GROUP_TYPE } from '../..';
import { getControlGroupEmbeddableFactory } from '../get_control_group_factory';
import { ControlGroupRenderer, ControlGroupRendererProps } from './control_group_renderer';

type ParentApiType = PublishesUnifiedSearch & {
  unifiedSearchFilters$?: PublishingSubject<Filter[] | undefined>;
};

describe('control group renderer', () => {
  const factory = getControlGroupEmbeddableFactory();
  const buildControlGroupSpy = jest.spyOn(factory, 'buildEmbeddable');

  const mountControlGroupRenderer = async (
    props: Omit<ControlGroupRendererProps, 'onApiAvailable'> = {}
  ) => {
    let controlGroupApi: ControlGroupRendererApi | undefined;
    const component = render(
      <ControlGroupRenderer
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

  beforeAll(() => {
    const embeddable = embeddablePluginMock.createSetupContract();
    embeddable.registerReactEmbeddableFactory(CONTROL_GROUP_TYPE, async () => {
      return factory;
    });
  });

  beforeEach(() => {
    buildControlGroupSpy.mockClear();
  });

  test('calls build method from the control group embeddable factory', async () => {
    await mountControlGroupRenderer();
    expect(buildControlGroupSpy).toBeCalledTimes(1);
  });

  test('calling `updateInput` forces control group to be rebuilt', async () => {
    const { api } = await mountControlGroupRenderer();
    expect(buildControlGroupSpy).toBeCalledTimes(1);
    act(() => api.updateInput({ autoApplySelections: false }));
    await waitFor(() => {
      expect(buildControlGroupSpy).toBeCalledTimes(2);
    });
  });

  test('filter changes are dispatched to control group if they are different', async () => {
    const initialFilters: Filter[] = [
      { meta: { alias: 'test', disabled: false, negate: false, index: 'test' } },
    ];
    const updatedFilters: Filter[] = [
      { meta: { alias: 'test', disabled: false, negate: true, index: 'test' } },
    ];

    const { component, api } = await mountControlGroupRenderer({ filters: initialFilters });
    expect((api.parentApi as ParentApiType).unifiedSearchFilters$?.getValue()).toEqual(
      initialFilters
    );
    component.rerender(
      <ControlGroupRenderer onApiAvailable={jest.fn()} filters={updatedFilters} />
    );
    expect((api.parentApi as ParentApiType).unifiedSearchFilters$?.getValue()).toEqual(
      updatedFilters
    );
  });

  test('query changes are dispatched to control group if they are different', async () => {
    const initialQuery = { language: 'kql', query: 'query' };
    const updatedQuery = { language: 'kql', query: 'super query' };

    const { component, api } = await mountControlGroupRenderer({ query: initialQuery });
    expect((api.parentApi as ParentApiType).query$.getValue()).toEqual(initialQuery);
    component.rerender(<ControlGroupRenderer onApiAvailable={jest.fn()} query={updatedQuery} />);
    expect((api.parentApi as ParentApiType).query$.getValue()).toEqual(updatedQuery);
  });

  test('time range changes are dispatched to control group if they are different', async () => {
    const initialTime = { from: new Date().toISOString(), to: new Date().toISOString() };
    const updatedTime = { from: new Date().toISOString() + 10, to: new Date().toISOString() + 20 };

    const { component, api } = await mountControlGroupRenderer({ timeRange: initialTime });
    expect((api.parentApi as ParentApiType).timeRange$.getValue()).toEqual(initialTime);
    component.rerender(<ControlGroupRenderer onApiAvailable={jest.fn()} timeRange={updatedTime} />);
    expect((api.parentApi as ParentApiType).timeRange$.getValue()).toEqual(updatedTime);
  });
});
