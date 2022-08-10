/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { findTestSubject, mountWithIntl } from '@kbn/test-jest-helpers';

import { DashboardContainer } from '../embeddable/dashboard_container';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { getSampleDashboardInput } from '../test_helpers';
import { CoreStart } from '@kbn/core/public';
import { coreMock, uiSettingsServiceMock } from '@kbn/core/public/mocks';
import { EuiModalFooter } from '@elastic/eui';
import { getStubPluginServices } from '@kbn/presentation-util-plugin/public';
import { screenshotModePluginMock } from '@kbn/screenshot-mode-plugin/public/mocks';
import { FiltersNotificationModal, FiltersNotificationProps } from './filters_notification_modal';
import { FilterableEmbeddable, isErrorEmbeddable, ViewMode } from '../../services/embeddable';
import {
  CONTACT_CARD_EMBEDDABLE,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  ContactCardEmbeddable,
} from '../../services/embeddable_test_samples';
import { act } from 'react-dom/test-utils';

describe('LibraryNotificationPopover', () => {
  const { setup, doStart } = embeddablePluginMock.createInstance();
  setup.registerEmbeddableFactory(
    CONTACT_CARD_EMBEDDABLE,
    new ContactCardEmbeddableFactory((() => null) as any, {} as any)
  );
  const start = doStart();

  let container: DashboardContainer;
  let embeddable: ContactCardEmbeddable & FilterableEmbeddable;
  let defaultProps: FiltersNotificationProps;
  let coreStart: CoreStart;

  beforeEach(async () => {
    coreStart = coreMock.createStart();

    const containerOptions = {
      ExitFullScreenButton: () => null,
      SavedObjectFinder: () => null,
      application: {} as any,
      embeddable: start,
      inspector: {} as any,
      notifications: {} as any,
      overlays: coreStart.overlays,
      savedObjectMetaData: {} as any,
      uiActions: {} as any,
      uiSettings: uiSettingsServiceMock.createStartContract(),
      http: coreStart.http,
      theme: coreStart.theme,
      presentationUtil: getStubPluginServices(),
      screenshotMode: screenshotModePluginMock.createSetupContract(),
    };

    container = new DashboardContainer(getSampleDashboardInput(), containerOptions);
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
