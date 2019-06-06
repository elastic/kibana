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

import '../np_core.test.mocks';

import React from 'react';

import {
  ContactCardEmbeddable,
  ContactCardEmbeddableInput,
  CONTACT_CARD_EMBEDDABLE,
  ContactCardEmbeddableFactory,
  HelloWorldContainer,
  EditModeAction,
  ContactCardEmbeddableOutput,
} from '../test_samples';
import {
  isErrorEmbeddable,
  ViewMode,
  actionRegistry,
  triggerRegistry,
  EmbeddablePanel,
} from '../../../embeddable_api/public';
import { mount } from 'enzyme';
import { nextTick } from 'test_utils/enzyme_helpers';

// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';
import { I18nProvider } from '@kbn/i18n/react';
import { CONTEXT_MENU_TRIGGER } from '../triggers';
import { attachAction } from '../triggers/attach_action';
import { createRegistry } from '../create_registry';
import { EmbeddableFactory } from '../embeddables';

const editModeAction = new EditModeAction();
actionRegistry.set(editModeAction.id, editModeAction);
attachAction(triggerRegistry, {
  triggerId: CONTEXT_MENU_TRIGGER,
  actionId: editModeAction.id,
});

const embeddableFactories = createRegistry<EmbeddableFactory>();
embeddableFactories.set(CONTACT_CARD_EMBEDDABLE, new ContactCardEmbeddableFactory());

test('HelloWorldContainer initializes embeddables', async done => {
  const container = new HelloWorldContainer(
    {
      id: '123',
      panels: {
        '123': {
          explicitInput: { id: '123', firstName: 'Sam' },
          type: CONTACT_CARD_EMBEDDABLE,
        },
      },
    },
    embeddableFactories
  );

  const subscription = container.getOutput$().subscribe(() => {
    if (container.getOutput().embeddableLoaded['123']) {
      const embeddable = container.getChild<ContactCardEmbeddable>('123');
      expect(embeddable).toBeDefined();
      expect(embeddable.id).toBe('123');
      done();
    }
  });

  if (container.getOutput().embeddableLoaded['123']) {
    const embeddable = container.getChild<ContactCardEmbeddable>('123');
    expect(embeddable).toBeDefined();
    expect(embeddable.id).toBe('123');
    subscription.unsubscribe();
    done();
  }
});

test('HelloWorldContainer.addNewEmbeddable', async () => {
  const container = new HelloWorldContainer({ id: '123', panels: {} }, embeddableFactories);
  const embeddable = await container.addNewEmbeddable<ContactCardEmbeddableInput>(
    CONTACT_CARD_EMBEDDABLE,
    {
      firstName: 'Kibana',
    }
  );
  expect(embeddable).toBeDefined();

  if (!isErrorEmbeddable(embeddable)) {
    expect(embeddable.getInput().firstName).toBe('Kibana');
  } else {
    expect(false).toBe(true);
  }

  const embeddableInContainer = container.getChild<ContactCardEmbeddable>(embeddable.id);
  expect(embeddableInContainer).toBeDefined();
  expect(embeddableInContainer.id).toBe(embeddable.id);
});

test('Container view mode change propagates to children', async () => {
  const container = new HelloWorldContainer(
    { id: '123', panels: {}, viewMode: ViewMode.VIEW },
    embeddableFactories
  );
  const embeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Bob',
  });

  expect(embeddable.getInput().viewMode).toBe(ViewMode.VIEW);

  container.updateInput({ viewMode: ViewMode.EDIT });

  expect(embeddable.getInput().viewMode).toBe(ViewMode.EDIT);
});

test('HelloWorldContainer in view mode hides edit mode actions', async () => {
  const container = new HelloWorldContainer(
    { id: '123', panels: {}, viewMode: ViewMode.VIEW },
    embeddableFactories
  );

  const embeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Bob',
  });

  const component = mount(
    <I18nProvider>
      <EmbeddablePanel embeddable={embeddable} />
    </I18nProvider>
  );

  findTestSubject(component, 'embeddablePanelToggleMenuIcon').simulate('click');
  expect(findTestSubject(component, `embeddablePanelContextMenuOpen`).length).toBe(1);
  await nextTick();
  component.update();
  expect(findTestSubject(component, `embeddablePanelAction-${editModeAction.id}`).length).toBe(0);
});

test('HelloWorldContainer in edit mode shows edit mode actions', async () => {
  const container = new HelloWorldContainer(
    { id: '123', panels: {}, viewMode: ViewMode.VIEW },
    embeddableFactories
  );

  const embeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Bob',
  });

  const component = mount(
    <I18nProvider>
      <EmbeddablePanel embeddable={embeddable} />
    </I18nProvider>
  );

  const button = findTestSubject(component, 'embeddablePanelToggleMenuIcon');

  expect(button.length).toBe(1);
  findTestSubject(component, 'embeddablePanelToggleMenuIcon').simulate('click');

  expect(findTestSubject(component, `embeddablePanelContextMenuOpen`).length).toBe(1);
  await nextTick();
  component.update();
  expect(findTestSubject(component, `embeddablePanelAction-${editModeAction.id}`).length).toBe(0);

  container.updateInput({ viewMode: ViewMode.EDIT });
  await nextTick();
  component.update();

  // Need to close and re-open to refresh. It doesn't update automatically.
  findTestSubject(component, 'embeddablePanelToggleMenuIcon').simulate('click');
  await nextTick();
  findTestSubject(component, 'embeddablePanelToggleMenuIcon').simulate('click');
  await nextTick();
  expect(findTestSubject(component, 'embeddablePanelContextMenuOpen').length).toBe(1);

  await nextTick();
  component.update();

  const action = findTestSubject(component, `embeddablePanelAction-${editModeAction.id}`);
  expect(action.length).toBe(1);
});

test('Updates when hidePanelTitles is toggled', async () => {
  const container = new HelloWorldContainer(
    { id: '123', panels: {}, viewMode: ViewMode.VIEW, hidePanelTitles: false },
    embeddableFactories
  );

  const embeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Rob',
    lastName: 'Stark',
  });

  const component = mount(
    <I18nProvider>
      <EmbeddablePanel embeddable={embeddable} />
    </I18nProvider>
  );

  let title = findTestSubject(component, `embeddablePanelHeading-HelloRobStark`);
  expect(title.length).toBe(1);

  await container.updateInput({ hidePanelTitles: true });

  await nextTick();
  component.update();

  title = findTestSubject(component, `embeddablePanelHeading-HelloRobStark`);
  expect(title.length).toBe(0);

  await container.updateInput({ hidePanelTitles: false });

  await nextTick();
  component.update();

  title = findTestSubject(component, `embeddablePanelHeading-HelloRobStark`);
  expect(title.length).toBe(1);
});
