/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
import { FilterableEmbeddable, isErrorEmbeddable, ViewMode } from '@kbn/embeddable-plugin/public';

import { DashboardContainer } from '../dashboard_container/embeddable/dashboard_container';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { getSampleDashboardInput } from '../mocks';
import { EuiPopover } from '@elastic/eui';
import {
  FiltersNotificationPopover,
  FiltersNotificationProps,
} from './filters_notification_popover';
import {
  ContactCardEmbeddable,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  CONTACT_CARD_EMBEDDABLE,
} from '@kbn/embeddable-plugin/public/lib/test_samples/embeddables';
import { act } from 'react-dom/test-utils';
import { pluginServices } from '../services/plugin_services';

describe('filters notification popover', () => {
  const mockEmbeddableFactory = new ContactCardEmbeddableFactory((() => null) as any, {} as any);
  pluginServices.getServices().embeddable.getEmbeddableFactory = jest
    .fn()
    .mockReturnValue(mockEmbeddableFactory);

  let container: DashboardContainer;
  let embeddable: ContactCardEmbeddable & FilterableEmbeddable;
  let defaultProps: FiltersNotificationProps;

  beforeEach(async () => {
    container = new DashboardContainer(getSampleDashboardInput());
    await container.untilInitialized();
    const contactCardEmbeddable = await container.addNewEmbeddable<
      ContactCardEmbeddableInput,
      ContactCardEmbeddableOutput,
      ContactCardEmbeddable
    >(CONTACT_CARD_EMBEDDABLE, {
      firstName: 'Kibanana',
    });
    if (isErrorEmbeddable(contactCardEmbeddable)) {
      throw new Error('Failed to create embeddable');
    }
    embeddable = embeddablePluginMock.mockFilterableEmbeddable(contactCardEmbeddable, {
      getFilters: jest.fn(),
      getQuery: jest.fn(),
    });

    defaultProps = {
      icon: 'test',
      context: { embeddable: contactCardEmbeddable },
      displayName: 'test display',
      id: 'testId',
      editPanelAction: {
        execute: jest.fn(),
      } as unknown as FiltersNotificationProps['editPanelAction'],
    };
  });

  function mountComponent(props?: Partial<FiltersNotificationProps>) {
    return mountWithIntl(<FiltersNotificationPopover {...{ ...defaultProps, ...props }} />);
  }

  test('clicking edit button executes edit panel action', async () => {
    embeddable.updateInput({ viewMode: ViewMode.EDIT });
    const component = mountComponent();

    await act(async () => {
      findTestSubject(component, `embeddablePanelNotification-${defaultProps.id}`).simulate(
        'click'
      );
    });
    await act(async () => {
      component.update();
    });

    const popover = component.find(EuiPopover);
    const editButton = findTestSubject(popover, 'filtersNotificationModal__editButton');
    editButton.simulate('click');
    expect(defaultProps.editPanelAction.execute).toHaveBeenCalled();
  });
});
