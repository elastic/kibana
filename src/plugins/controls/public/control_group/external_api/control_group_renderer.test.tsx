/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import {
  ControlGroupContainer,
  ControlGroupContainerFactory,
  ControlGroupRenderer,
  CONTROL_GROUP_TYPE,
} from '..';
import { pluginServices } from '../../services/plugin_services';
import { ReactWrapper } from 'enzyme';
import { Filter } from '@kbn/es-query';

describe('control group renderer', () => {
  let mockControlGroupFactory: ControlGroupContainerFactory;
  let mockControlGroupContainer: ControlGroupContainer;

  beforeEach(() => {
    mockControlGroupContainer = {
      destroy: jest.fn(),
      render: jest.fn(),
      updateInput: jest.fn(),
      getInput: jest.fn().mockReturnValue({}),
    } as unknown as ControlGroupContainer;
    mockControlGroupFactory = {
      create: jest.fn().mockReturnValue(mockControlGroupContainer),
    } as unknown as ControlGroupContainerFactory;
    pluginServices.getServices().embeddable.getEmbeddableFactory = jest
      .fn()
      .mockReturnValue(mockControlGroupFactory);
  });

  test('calls create method on the Control Group embeddable factory with returned initial input', async () => {
    await act(async () => {
      mountWithIntl(
        <ControlGroupRenderer
          getCreationOptions={() => Promise.resolve({ initialInput: { controlStyle: 'twoLine' } })}
        />
      );
    });
    expect(pluginServices.getServices().embeddable.getEmbeddableFactory).toHaveBeenCalledWith(
      CONTROL_GROUP_TYPE
    );
    expect(mockControlGroupFactory.create).toHaveBeenCalledWith(
      expect.objectContaining({ controlStyle: 'twoLine' }),
      undefined,
      { lastSavedInput: expect.objectContaining({ controlStyle: 'twoLine' }) },
      undefined
    );
  });

  test('destroys control group container on unmount', async () => {
    let wrapper: ReactWrapper;
    await act(async () => {
      wrapper = await mountWithIntl(<ControlGroupRenderer />);
    });
    wrapper!.unmount();
    expect(mockControlGroupContainer.destroy).toHaveBeenCalledTimes(1);
  });

  test('filter changes are dispatched to control group if they are different', async () => {
    const initialFilters: Filter[] = [
      { meta: { alias: 'test', disabled: false, negate: false, index: 'test' } },
    ];
    const updatedFilters: Filter[] = [
      { meta: { alias: 'test', disabled: false, negate: true, index: 'test' } },
    ];
    let wrapper: ReactWrapper;
    await act(async () => {
      wrapper = mountWithIntl(
        <ControlGroupRenderer
          getCreationOptions={() => Promise.resolve({ initialInput: { filters: initialFilters } })}
        />
      );
    });
    await act(async () => {
      await wrapper.setProps({ filters: updatedFilters });
    });
    expect(mockControlGroupContainer.updateInput).toHaveBeenCalledWith(
      expect.objectContaining({ filters: updatedFilters })
    );
  });

  test('query changes are dispatched to control group if they are different', async () => {
    const initialQuery = { language: 'kql', query: 'query' };
    const updatedQuery = { language: 'kql', query: 'super query' };
    let wrapper: ReactWrapper;
    await act(async () => {
      wrapper = mountWithIntl(
        <ControlGroupRenderer
          getCreationOptions={() => Promise.resolve({ initialInput: { query: initialQuery } })}
        />
      );
    });
    await act(async () => {
      await wrapper.setProps({ query: updatedQuery });
    });
    expect(mockControlGroupContainer.updateInput).toHaveBeenCalledWith(
      expect.objectContaining({ query: updatedQuery })
    );
  });

  test('time range changes are dispatched to control group if they are different', async () => {
    const initialTime = { from: new Date().toISOString(), to: new Date().toISOString() };
    const updatedTime = { from: new Date().toISOString() + 10, to: new Date().toISOString() + 20 };
    let wrapper: ReactWrapper;
    await act(async () => {
      wrapper = mountWithIntl(
        <ControlGroupRenderer
          getCreationOptions={() => Promise.resolve({ initialInput: { timeRange: initialTime } })}
        />
      );
    });
    await act(async () => {
      await wrapper.setProps({ timeRange: updatedTime });
    });
    expect(mockControlGroupContainer.updateInput).toHaveBeenCalledWith(
      expect.objectContaining({ timeRange: updatedTime })
    );
  });
});
