/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { DashboardContainer } from '../embeddable/dashboard_container';
import { embeddablePluginMock } from '../../../../embeddable/public/mocks';
import { getSampleDashboardInput } from '../test_helpers';
import {
  LibraryNotificationPopover,
  LibraryNotificationProps,
} from './library_notification_popover';
import { CoreStart } from '../../../../../core/public';
import { coreMock, uiSettingsServiceMock } from '../../../../../core/public/mocks';
import { findTestSubject } from '@elastic/eui/lib/test';
import { EuiPopover } from '@elastic/eui';
import { isErrorEmbeddable } from '../../services/embeddable';
import {
  CONTACT_CARD_EMBEDDABLE,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  ContactCardEmbeddable,
} from '../../services/embeddable_test_samples';
import { getStubPluginServices } from '../../../../presentation_util/public';
import { screenshotModePluginMock } from '../../../../screenshot_mode/public/mocks';

describe('LibraryNotificationPopover', () => {
  const { setup, doStart } = embeddablePluginMock.createInstance();
  setup.registerEmbeddableFactory(
    CONTACT_CARD_EMBEDDABLE,
    new ContactCardEmbeddableFactory((() => null) as any, {} as any)
  );
  const start = doStart();

  let container: DashboardContainer;
  let defaultProps: LibraryNotificationProps;
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

    defaultProps = {
      unlinkAction: {
        execute: jest.fn(),
        getDisplayName: () => 'test unlink',
      } as unknown as LibraryNotificationProps['unlinkAction'],
      displayName: 'test display',
      context: { embeddable: contactCardEmbeddable },
      icon: 'testIcon',
      id: 'testId',
    };
  });

  function mountComponent(props?: Partial<LibraryNotificationProps>) {
    return mountWithIntl(<LibraryNotificationPopover {...{ ...defaultProps, ...props }} />);
  }

  test('click library notification badge should open and close popover', () => {
    const component = mountComponent();
    const btn = findTestSubject(component, `embeddablePanelNotification-${defaultProps.id}`);
    btn.simulate('click');
    let popover = component.find(EuiPopover);
    expect(popover.prop('isOpen')).toBe(true);
    btn.simulate('click');
    popover = component.find(EuiPopover);
    expect(popover.prop('isOpen')).toBe(false);
  });

  test('popover should contain button with unlink action display name', () => {
    const component = mountComponent();
    const btn = findTestSubject(component, `embeddablePanelNotification-${defaultProps.id}`);
    btn.simulate('click');
    const popover = component.find(EuiPopover);
    const unlinkButton = findTestSubject(popover, 'libraryNotificationUnlinkButton');
    expect(unlinkButton.text()).toEqual('test unlink');
  });

  test('clicking unlink executes unlink action', () => {
    const component = mountComponent();
    const btn = findTestSubject(component, `embeddablePanelNotification-${defaultProps.id}`);
    btn.simulate('click');
    const popover = component.find(EuiPopover);
    const unlinkButton = findTestSubject(popover, 'libraryNotificationUnlinkButton');
    unlinkButton.simulate('click');
    expect(defaultProps.unlinkAction.execute).toHaveBeenCalled();
  });
});
