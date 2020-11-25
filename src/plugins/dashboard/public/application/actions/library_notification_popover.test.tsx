/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { DashboardContainer } from '..';
import { isErrorEmbeddable } from '../../embeddable_plugin';
import { mountWithIntl } from '@kbn/test/jest';
import { embeddablePluginMock } from '../../../../embeddable/public/mocks';
import { getSampleDashboardInput } from '../test_helpers';
import {
  CONTACT_CARD_EMBEDDABLE,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddable,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
} from '../../embeddable_plugin_test_samples';
import {
  LibraryNotificationPopover,
  LibraryNotificationProps,
} from './library_notification_popover';
import { CoreStart } from '../../../../../core/public';
import { coreMock } from '../../../../../core/public/mocks';
import { findTestSubject } from '@elastic/eui/lib/test';
import { EuiPopover } from '@elastic/eui';

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
      unlinkAction: ({
        execute: jest.fn(),
        getDisplayName: () => 'test unlink',
      } as unknown) as LibraryNotificationProps['unlinkAction'],
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
