/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { NotFoundPrompt } from '@kbn/shared-ux-prompt-not-found';
import { setStubKibanaServices } from '@kbn/embeddable-plugin/public/mocks';

import { DashboardContainerFactory } from '..';
import { DASHBOARD_CONTAINER_TYPE } from '../..';
import { DashboardRenderer } from './dashboard_renderer';
import { pluginServices } from '../../services/plugin_services';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/common';
import { DashboardContainer } from '../embeddable/dashboard_container';
import { DashboardCreationOptions } from '../embeddable/dashboard_container_factory';
import { setStubKibanaServices as setPresentationPanelMocks } from '@kbn/presentation-panel-plugin/public/mocks';

describe('dashboard renderer', () => {
  let mockDashboardContainer: DashboardContainer;
  let mockDashboardFactory: DashboardContainerFactory;

  beforeEach(() => {
    mockDashboardContainer = {
      destroy: jest.fn(),
      render: jest.fn(),
      select: jest.fn(),
      navigateToDashboard: jest.fn().mockResolvedValue({}),
      getInput: jest.fn().mockResolvedValue({}),
    } as unknown as DashboardContainer;
    mockDashboardFactory = {
      create: jest.fn().mockReturnValue(mockDashboardContainer),
    } as unknown as DashboardContainerFactory;
    pluginServices.getServices().embeddable.getEmbeddableFactory = jest
      .fn()
      .mockReturnValue(mockDashboardFactory);
    setPresentationPanelMocks();
  });

  test('calls create method on the Dashboard embeddable factory', async () => {
    await act(async () => {
      mountWithIntl(<DashboardRenderer />);
    });
    expect(pluginServices.getServices().embeddable.getEmbeddableFactory).toHaveBeenCalledWith(
      DASHBOARD_CONTAINER_TYPE
    );
    expect(mockDashboardFactory.create).toHaveBeenCalled();
  });

  test('saved object id & creation options are passed to dashboard factory', async () => {
    const options: DashboardCreationOptions = {
      useControlGroupIntegration: true,
      useSessionStorageIntegration: true,
      useUnifiedSearchIntegration: true,
    };
    await act(async () => {
      mountWithIntl(
        <DashboardRenderer
          savedObjectId="saved_object_kibanana"
          getCreationOptions={() => Promise.resolve(options)}
        />
      );
    });
    expect(mockDashboardFactory.create).toHaveBeenCalledWith(
      expect.any(Object),
      undefined,
      options,
      'saved_object_kibanana'
    );
  });

  test('destroys dashboard container on unmount', async () => {
    let wrapper: ReactWrapper;
    await act(async () => {
      wrapper = await mountWithIntl(<DashboardRenderer savedObjectId="saved_object_kibanana" />);
    });
    wrapper!.unmount();
    expect(mockDashboardContainer.destroy).toHaveBeenCalledTimes(1);
  });

  test('calls navigate and does not destroy dashboard container on ID change', async () => {
    let wrapper: ReactWrapper;
    await act(async () => {
      wrapper = await mountWithIntl(<DashboardRenderer savedObjectId="saved_object_kibanana" />);
    });
    await act(async () => {
      await wrapper.setProps({ savedObjectId: 'saved_object_kibanakiwi' });
    });
    expect(mockDashboardContainer.destroy).not.toHaveBeenCalled();
    expect(mockDashboardContainer.navigateToDashboard).toHaveBeenCalledWith(
      'saved_object_kibanakiwi'
    );
  });

  test('renders and destroys an error embeddable when the dashboard factory create method throws an error', async () => {
    const mockErrorEmbeddable = {
      error: 'oh my goodness an error',
      destroy: jest.fn(),
      render: jest.fn(),
    } as unknown as DashboardContainer;
    mockDashboardFactory = {
      create: jest.fn().mockReturnValue(mockErrorEmbeddable),
    } as unknown as DashboardContainerFactory;
    pluginServices.getServices().embeddable.getEmbeddableFactory = jest
      .fn()
      .mockReturnValue(mockDashboardFactory);

    let wrapper: ReactWrapper;
    await act(async () => {
      wrapper = await mountWithIntl(<DashboardRenderer savedObjectId="saved_object_kibanana" />);
    });

    expect(mockErrorEmbeddable.render).toHaveBeenCalled();
    wrapper!.unmount();
    expect(mockErrorEmbeddable.destroy).toHaveBeenCalledTimes(1);
  });

  test('creates a new dashboard container when the ID changes, and the first created dashboard resulted in an error', async () => {
    // ensure that the first attempt at creating a dashboard results in an error embeddable
    const mockErrorEmbeddable = {
      error: 'oh my goodness an error',
      destroy: jest.fn(),
      render: jest.fn(),
    } as unknown as DashboardContainer;
    const mockErrorFactory = {
      create: jest.fn().mockReturnValue(mockErrorEmbeddable),
    } as unknown as DashboardContainerFactory;
    pluginServices.getServices().embeddable.getEmbeddableFactory = jest
      .fn()
      .mockReturnValue(mockErrorFactory);

    // render the dashboard - it should run into an error and render the error embeddable.
    let wrapper: ReactWrapper;
    await act(async () => {
      wrapper = await mountWithIntl(<DashboardRenderer savedObjectId="saved_object_kibanana" />);
    });
    expect(mockErrorEmbeddable.render).toHaveBeenCalled();
    expect(mockErrorFactory.create).toHaveBeenCalledTimes(1);

    // ensure that the next attempt at creating a dashboard is successfull.
    const mockSuccessEmbeddable = {
      destroy: jest.fn(),
      render: jest.fn(),
      navigateToDashboard: jest.fn(),
      select: jest.fn(),
      getInput: jest.fn().mockResolvedValue({}),
    } as unknown as DashboardContainer;
    const mockSuccessFactory = {
      create: jest.fn().mockReturnValue(mockSuccessEmbeddable),
    } as unknown as DashboardContainerFactory;
    pluginServices.getServices().embeddable.getEmbeddableFactory = jest
      .fn()
      .mockReturnValue(mockSuccessFactory);

    // update the saved object id to trigger another dashboard load.
    await act(async () => {
      await wrapper.setProps({ savedObjectId: 'saved_object_kibanakiwi' });
    });

    expect(mockErrorEmbeddable.destroy).toHaveBeenCalled();

    // because a new dashboard container has been created, we should not call navigate.
    expect(mockSuccessEmbeddable.navigateToDashboard).not.toHaveBeenCalled();

    // instead we should call create on the factory again.
    expect(mockSuccessFactory.create).toHaveBeenCalledTimes(1);
  });

  test('renders a 404 page when initial dashboard creation returns a savedObjectNotFound error', async () => {
    // mock embeddable dependencies so that the embeddable panel renders
    setStubKibanaServices();

    // ensure that the first attempt at creating a dashboard results in a 404
    const mockErrorEmbeddable = {
      error: new SavedObjectNotFound('dashboard', 'gat em'),
      destroy: jest.fn(),
      render: jest.fn(),
    } as unknown as DashboardContainer;
    const mockErrorFactory = {
      create: jest.fn().mockReturnValue(mockErrorEmbeddable),
    } as unknown as DashboardContainerFactory;
    pluginServices.getServices().embeddable.getEmbeddableFactory = jest
      .fn()
      .mockReturnValue(mockErrorFactory);

    // render the dashboard - it should run into an error and render the error embeddable.
    let wrapper: ReactWrapper;
    await act(async () => {
      wrapper = await mountWithIntl(<DashboardRenderer savedObjectId="saved_object_kibanana" />);
    });
    await wrapper!.update();

    // The shared UX not found prompt should be rendered.
    expect(wrapper!.find(NotFoundPrompt).exists()).toBeTruthy();
  });

  test('renders a 404 page when dashboard navigation returns a savedObjectNotFound error', async () => {
    mockDashboardContainer.navigateToDashboard = jest
      .fn()
      .mockRejectedValue(new SavedObjectNotFound('dashboard', 'gat em'));

    let wrapper: ReactWrapper;
    await act(async () => {
      wrapper = await mountWithIntl(<DashboardRenderer savedObjectId="saved_object_kibanana" />);
    });
    // The shared UX not found prompt should not be rendered.
    expect(wrapper!.find(NotFoundPrompt).exists()).toBeFalsy();

    expect(mockDashboardContainer.render).toHaveBeenCalled();
    await act(async () => {
      await wrapper.setProps({ savedObjectId: 'saved_object_kibanakiwi' });
    });
    await wrapper!.update();

    // The shared UX not found prompt should be rendered.
    expect(wrapper!.find(NotFoundPrompt).exists()).toBeTruthy();
  });

  test('does not add a class to the parent element when expandedPanelId is undefined', async () => {
    let wrapper: ReactWrapper;
    await act(async () => {
      wrapper = await mountWithIntl(
        <div id="superParent">
          <DashboardRenderer />
        </div>
      );
    });
    await wrapper!.update();

    expect(
      wrapper!.find('#superParent').getDOMNode().classList.contains('dshDashboardViewportWrapper')
    ).toBe(false);
  });

  test('adds a class to the parent element when expandedPanelId is truthy', async () => {
    const mockSuccessEmbeddable = {
      destroy: jest.fn(),
      render: jest.fn(),
      navigateToDashboard: jest.fn(),
      select: jest.fn().mockReturnValue('WhatAnExpandedPanel'),
      getInput: jest.fn().mockResolvedValue({}),
    } as unknown as DashboardContainer;
    const mockSuccessFactory = {
      create: jest.fn().mockReturnValue(mockSuccessEmbeddable),
    } as unknown as DashboardContainerFactory;
    pluginServices.getServices().embeddable.getEmbeddableFactory = jest
      .fn()
      .mockReturnValue(mockSuccessFactory);

    let wrapper: ReactWrapper;
    await act(async () => {
      wrapper = await mountWithIntl(
        <div id="superParent">
          <DashboardRenderer savedObjectId="saved_object_kibanana" />
        </div>
      );
    });

    expect(
      wrapper!.find('#superParent').getDOMNode().classList.contains('dshDashboardViewportWrapper')
    ).toBe(true);
  });

  test('adds a class to apply default background color when dashboard has use margin option set to false', async () => {
    const mockUseMarginFalseEmbeddable = {
      ...mockDashboardContainer,
      getInput: jest.fn().mockResolvedValue({ useMargins: false }),
    } as unknown as DashboardContainer;

    const mockUseMarginFalseFactory = {
      create: jest.fn().mockReturnValue(mockUseMarginFalseEmbeddable),
    } as unknown as DashboardContainerFactory;
    pluginServices.getServices().embeddable.getEmbeddableFactory = jest
      .fn()
      .mockReturnValue(mockUseMarginFalseFactory);

    let wrapper: ReactWrapper;
    await act(async () => {
      wrapper = await mountWithIntl(
        <div id="superParent">
          <DashboardRenderer savedObjectId="saved_object_kibanana" />
        </div>
      );
    });

    expect(
      wrapper!
        .find('#superParent')
        .getDOMNode()
        .classList.contains('dshDashboardViewportWrapper--defaultBg')
    ).not.toBe(null);
  });
});
