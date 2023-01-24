/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiPopover } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';

import {
  ContactCardEmbeddable,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  CONTACT_CARD_EMBEDDABLE,
} from '@kbn/embeddable-plugin/public/lib/test_samples/embeddables';
import { isErrorEmbeddable } from '@kbn/embeddable-plugin/public';

import {
  LibraryNotificationPopover,
  LibraryNotificationProps,
} from './library_notification_popover';
import { getSampleDashboardInput } from '../mocks';
import { pluginServices } from '../services/plugin_services';
import { DashboardContainer } from '../dashboard_container/embeddable/dashboard_container';

describe('LibraryNotificationPopover', () => {
  const mockEmbeddableFactory = new ContactCardEmbeddableFactory((() => null) as any, {} as any);
  pluginServices.getServices().embeddable.getEmbeddableFactory = jest
    .fn()
    .mockReturnValue(mockEmbeddableFactory);

  let container: DashboardContainer;
  let defaultProps: LibraryNotificationProps;

  beforeEach(async () => {
    container = new DashboardContainer(getSampleDashboardInput());

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
