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

// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';
import React from 'react';
import { mount } from 'enzyme';
import { nextTick } from 'test_utils/enzyme_helpers';
import { I18nProvider } from '@kbn/i18n/react';
import { ViewMode, CONTEXT_MENU_TRIGGER, EmbeddablePanel } from '../lib/embeddable_api';
import {
  DashboardContainer,
  DashboardContainerOptions,
} from '../lib/embeddable/dashboard_container';
import { getSampleDashboardInput } from '../lib/test_helpers';
import {
  CONTACT_CARD_EMBEDDABLE,
  ContactCardEmbeddableFactory,
} from '../../../../../embeddable_api/public/np_ready/public/lib/test_samples/embeddables/contact_card/contact_card_embeddable_factory';
import {
  ContactCardEmbeddableInput,
  ContactCardEmbeddable,
  ContactCardEmbeddableOutput,
} from '../../../../../embeddable_api/public/np_ready/public/lib/test_samples/embeddables/contact_card/contact_card_embeddable';
import { embeddablePluginMock } from '../../../../../embeddable_api/public/np_ready/public/mocks';
import { createEditModeAction } from '../../../../../embeddable_api/public/np_ready/public/lib/test_samples/actions/edit_mode_action';
// eslint-disable-next-line
import { inspectorPluginMock } from '../../../../../../../plugins/inspector/public/mocks';
import { KibanaContextProvider } from '../../../../../../../plugins/kibana_react/public';
// eslint-disable-next-line
import { uiActionsPluginMock } from 'src/plugins/ui_actions/public/mocks';

test('DashboardContainer in edit mode shows edit mode actions', async () => {
  const inspector = inspectorPluginMock.createStartContract();
  const { setup, doStart } = embeddablePluginMock.createInstance();
  const uiActionsSetup = uiActionsPluginMock.createSetupContract();

  const editModeAction = createEditModeAction();
  uiActionsSetup.registerAction(editModeAction);
  uiActionsSetup.attachAction(CONTEXT_MENU_TRIGGER, editModeAction.id);
  setup.registerEmbeddableFactory(
    CONTACT_CARD_EMBEDDABLE,
    new ContactCardEmbeddableFactory({} as any, (() => null) as any, {} as any)
  );

  const start = doStart();

  const initialInput = getSampleDashboardInput({ viewMode: ViewMode.VIEW });
  const options: DashboardContainerOptions = {
    application: {} as any,
    embeddable: start,
    notifications: {} as any,
    overlays: {} as any,
    inspector: {} as any,
    SavedObjectFinder: () => null,
    ExitFullScreenButton: () => null,
    uiActions: {} as any,
  };
  const container = new DashboardContainer(initialInput, options);

  const embeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Bob',
  });

  const component = mount(
    <I18nProvider>
      <KibanaContextProvider services={options}>
        <EmbeddablePanel
          embeddable={embeddable}
          getActions={() => Promise.resolve([])}
          getAllEmbeddableFactories={(() => []) as any}
          getEmbeddableFactory={(() => null) as any}
          notifications={{} as any}
          overlays={{} as any}
          inspector={inspector}
          SavedObjectFinder={() => null}
        />
      </KibanaContextProvider>
    </I18nProvider>
  );

  const button = findTestSubject(component, 'embeddablePanelToggleMenuIcon');

  expect(button.length).toBe(1);
  findTestSubject(component, 'embeddablePanelToggleMenuIcon').simulate('click');

  expect(findTestSubject(component, `embeddablePanelContextMenuOpen`).length).toBe(1);

  const editAction = findTestSubject(component, `embeddablePanelAction-${editModeAction.id}`);

  expect(editAction.length).toBe(0);

  container.updateInput({ viewMode: ViewMode.EDIT });
  await nextTick();
  component.update();
  findTestSubject(component, 'embeddablePanelToggleMenuIcon').simulate('click');
  await nextTick();
  component.update();
  expect(findTestSubject(component, 'embeddablePanelContextMenuOpen').length).toBe(0);
  findTestSubject(component, 'embeddablePanelToggleMenuIcon').simulate('click');
  await nextTick();
  component.update();
  expect(findTestSubject(component, 'embeddablePanelContextMenuOpen').length).toBe(1);

  await nextTick();
  component.update();

  // TODO: Address this.
  // const action = findTestSubject(component, `embeddablePanelAction-${editModeAction.id}`);
  // expect(action.length).toBe(1);
});
