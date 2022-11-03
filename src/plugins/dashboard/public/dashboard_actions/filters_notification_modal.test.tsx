/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { EuiModalFooter } from '@elastic/eui';

import {
  ContactCardEmbeddable,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  CONTACT_CARD_EMBEDDABLE,
} from '@kbn/embeddable-plugin/public/lib/test_samples/embeddables';
import { findTestSubject, mountWithIntl } from '@kbn/test-jest-helpers';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { FilterableEmbeddable, isErrorEmbeddable, ViewMode } from '@kbn/embeddable-plugin/public';

import { getSampleDashboardInput } from '../mocks';
import { DashboardContainer } from '../dashboard_container';
import { pluginServices } from '../services/plugin_services';
import { FiltersNotificationModal, FiltersNotificationProps } from './filters_notification_modal';

describe('LibraryNotificationPopover', () => {
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
      context: { embeddable: contactCardEmbeddable },
      displayName: 'test display',
      id: 'testId',
      editPanelAction: {
        execute: jest.fn(),
      } as unknown as FiltersNotificationProps['editPanelAction'],
      onClose: jest.fn(),
    };
  });

  function mountComponent(props?: Partial<FiltersNotificationProps>) {
    return mountWithIntl(<FiltersNotificationModal {...{ ...defaultProps, ...props }} />);
  }

  test('show modal footer in edit mode', async () => {
    embeddable.updateInput({ viewMode: ViewMode.EDIT });
    await act(async () => {
      const component = mountComponent();
      const footer = component.find(EuiModalFooter);
      expect(footer.exists()).toBe(true);
    });
  });

  test('hide modal footer in view mode', async () => {
    embeddable.updateInput({ viewMode: ViewMode.VIEW });
    await act(async () => {
      const component = mountComponent();
      const footer = component.find(EuiModalFooter);
      expect(footer.exists()).toBe(false);
    });
  });

  test('clicking edit button executes edit panel action', async () => {
    embeddable.updateInput({ viewMode: ViewMode.EDIT });
    await act(async () => {
      const component = mountComponent();
      const editButton = findTestSubject(component, 'filtersNotificationModal__editButton');
      editButton.simulate('click');
      expect(defaultProps.editPanelAction.execute).toHaveBeenCalled();
    });
  });

  test('clicking close button calls onClose', async () => {
    embeddable.updateInput({ viewMode: ViewMode.EDIT });
    await act(async () => {
      const component = mountComponent();
      const editButton = findTestSubject(component, 'filtersNotificationModal__closeButton');
      editButton.simulate('click');
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });
});
