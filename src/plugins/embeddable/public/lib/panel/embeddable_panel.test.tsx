/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount } from 'enzyme';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';

import { findTestSubject } from '@elastic/eui/lib/test';
import { I18nProvider } from '@kbn/i18n-react';
import { CONTEXT_MENU_TRIGGER } from '../triggers';
import { Action, UiActionsStart } from '../../../../ui_actions/public';
import { Trigger, ViewMode } from '../types';
import { isErrorEmbeddable } from '../embeddables';
import { EmbeddablePanel } from './embeddable_panel';
import { createEditModeAction } from '../test_samples/actions';
import {
  ContactCardEmbeddableFactory,
  CONTACT_CARD_EMBEDDABLE,
} from '../test_samples/embeddables/contact_card/contact_card_embeddable_factory';
import { HelloWorldContainer } from '../test_samples/embeddables/hello_world_container';
import {
  ContactCardEmbeddable,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
} from '../test_samples/embeddables/contact_card/contact_card_embeddable';
import { inspectorPluginMock } from '../../../../inspector/public/mocks';
import { EuiBadge } from '@elastic/eui';
import { embeddablePluginMock } from '../../mocks';
import { applicationServiceMock, themeServiceMock } from '../../../../../core/public/mocks';

const actionRegistry = new Map<string, Action>();
const triggerRegistry = new Map<string, Trigger>();

const { setup, doStart } = embeddablePluginMock.createInstance();

const editModeAction = createEditModeAction();
const trigger: Trigger = {
  id: CONTEXT_MENU_TRIGGER,
};
const embeddableFactory = new ContactCardEmbeddableFactory((() => null) as any, {} as any);
const applicationMock = applicationServiceMock.createStartContract();
const theme = themeServiceMock.createStartContract();

actionRegistry.set(editModeAction.id, editModeAction);
triggerRegistry.set(trigger.id, trigger);
setup.registerEmbeddableFactory(embeddableFactory.type, embeddableFactory);

const start = doStart();
const getEmbeddableFactory = start.getEmbeddableFactory;
test('HelloWorldContainer initializes embeddables', async (done) => {
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
    { getEmbeddableFactory } as any
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
  const container = new HelloWorldContainer({ id: '123', panels: {} }, {
    getEmbeddableFactory,
  } as any);
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
  const container = new HelloWorldContainer({ id: '123', panels: {}, viewMode: ViewMode.VIEW }, {
    getEmbeddableFactory,
  } as any);
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
  const inspector = inspectorPluginMock.createStartContract();

  const container = new HelloWorldContainer({ id: '123', panels: {}, viewMode: ViewMode.VIEW }, {
    getEmbeddableFactory,
  } as any);

  const embeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Bob',
  });

  const component = mount(
    <I18nProvider>
      <EmbeddablePanel
        embeddable={embeddable}
        getActions={() => Promise.resolve([])}
        getAllEmbeddableFactories={start.getEmbeddableFactories}
        getEmbeddableFactory={start.getEmbeddableFactory}
        notifications={{} as any}
        application={applicationMock}
        overlays={{} as any}
        inspector={inspector}
        SavedObjectFinder={() => null}
        theme={theme}
      />
    </I18nProvider>
  );

  findTestSubject(component, 'embeddablePanelToggleMenuIcon').simulate('click');
  expect(findTestSubject(component, `embeddablePanelContextMenuOpen`).length).toBe(1);
  await nextTick();
  component.update();
  expect(findTestSubject(component, `embeddablePanelAction-${editModeAction.id}`).length).toBe(0);
});

const renderInEditModeAndOpenContextMenu = async (
  embeddableInputs: any,
  getActions: UiActionsStart['getTriggerCompatibleActions'] = () => Promise.resolve([])
) => {
  const inspector = inspectorPluginMock.createStartContract();

  const container = new HelloWorldContainer({ id: '123', panels: {}, viewMode: ViewMode.VIEW }, {
    getEmbeddableFactory,
  } as any);

  const embeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, embeddableInputs);

  const component = mount(
    <I18nProvider>
      <EmbeddablePanel
        embeddable={embeddable}
        getActions={getActions}
        getAllEmbeddableFactories={start.getEmbeddableFactories}
        getEmbeddableFactory={start.getEmbeddableFactory}
        notifications={{} as any}
        overlays={{} as any}
        application={applicationMock}
        inspector={inspector}
        SavedObjectFinder={() => null}
        theme={theme}
      />
    </I18nProvider>
  );

  findTestSubject(component, 'embeddablePanelToggleMenuIcon').simulate('click');
  await nextTick();
  component.update();

  return { component };
};

test('HelloWorldContainer in edit mode hides disabledActions', async () => {
  const action = {
    id: 'FOO',
    type: 'FOO',
    getIconType: () => undefined,
    getDisplayName: () => 'foo',
    isCompatible: async () => true,
    execute: async () => {},
    order: 10,
    getHref: () => {
      return Promise.resolve(undefined);
    },
  };
  const getActions = () => Promise.resolve([action]);

  const { component: component1 } = await renderInEditModeAndOpenContextMenu(
    {
      firstName: 'Bob',
    },
    getActions
  );
  const { component: component2 } = await renderInEditModeAndOpenContextMenu(
    {
      firstName: 'Bob',
      disabledActions: ['FOO'],
    },
    getActions
  );

  const fooContextMenuActionItem1 = findTestSubject(component1, 'embeddablePanelAction-FOO');
  const fooContextMenuActionItem2 = findTestSubject(component2, 'embeddablePanelAction-FOO');

  expect(fooContextMenuActionItem1.length).toBe(1);
  expect(fooContextMenuActionItem2.length).toBe(0);
});

test('HelloWorldContainer hides disabled badges', async () => {
  const action = {
    id: 'BAR',
    type: 'BAR',
    getIconType: () => undefined,
    getDisplayName: () => 'bar',
    isCompatible: async () => true,
    execute: async () => {},
    order: 10,
    getHref: () => {
      return Promise.resolve(undefined);
    },
  };
  const getActions = () => Promise.resolve([action]);

  const { component: component1 } = await renderInEditModeAndOpenContextMenu(
    {
      firstName: 'Bob',
    },
    getActions
  );
  const { component: component2 } = await renderInEditModeAndOpenContextMenu(
    {
      firstName: 'Bob',
      disabledActions: ['BAR'],
    },
    getActions
  );

  expect(component1.find(EuiBadge).length).toBe(1);
  expect(component2.find(EuiBadge).length).toBe(0);
});

test('HelloWorldContainer in edit mode shows edit mode actions', async () => {
  const inspector = inspectorPluginMock.createStartContract();

  const container = new HelloWorldContainer({ id: '123', panels: {}, viewMode: ViewMode.VIEW }, {
    getEmbeddableFactory,
  } as any);

  const embeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Bob',
  });

  const component = mount(
    <I18nProvider>
      <EmbeddablePanel
        embeddable={embeddable}
        getActions={() => Promise.resolve([])}
        getAllEmbeddableFactories={start.getEmbeddableFactories}
        getEmbeddableFactory={start.getEmbeddableFactory}
        notifications={{} as any}
        overlays={{} as any}
        application={applicationMock}
        inspector={inspector}
        SavedObjectFinder={() => null}
        theme={theme}
      />
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

  container.updateInput({ viewMode: ViewMode.VIEW });
  await nextTick();
  component.update();

  // TODO: Fix this.
  // const action = findTestSubject(component, `embeddablePanelAction-${editModeAction.id}`);
  // expect(action.length).toBe(1);
});

test('Panel title customize link does not exist in view mode', async () => {
  const inspector = inspectorPluginMock.createStartContract();

  const container = new HelloWorldContainer(
    { id: '123', panels: {}, viewMode: ViewMode.VIEW, hidePanelTitles: false },
    { getEmbeddableFactory } as any
  );

  const embeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Vayon',
    lastName: 'Poole',
  });

  const component = mountWithIntl(
    <EmbeddablePanel
      embeddable={embeddable}
      getActions={() => Promise.resolve([])}
      getAllEmbeddableFactories={start.getEmbeddableFactories}
      getEmbeddableFactory={start.getEmbeddableFactory}
      notifications={{} as any}
      overlays={{} as any}
      application={applicationMock}
      inspector={inspector}
      SavedObjectFinder={() => null}
      theme={theme}
    />
  );

  const titleLink = findTestSubject(component, 'embeddablePanelTitleLink');
  expect(titleLink.length).toBe(0);
});

test('Runs customize panel action on title click when in edit mode', async () => {
  const inspector = inspectorPluginMock.createStartContract();

  const container = new HelloWorldContainer(
    { id: '123', panels: {}, viewMode: ViewMode.EDIT, hidePanelTitles: false },
    { getEmbeddableFactory } as any
  );

  const embeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Vayon',
    lastName: 'Poole',
  });

  const component = mountWithIntl(
    <EmbeddablePanel
      embeddable={embeddable}
      getActions={() => Promise.resolve([])}
      getAllEmbeddableFactories={start.getEmbeddableFactories}
      getEmbeddableFactory={start.getEmbeddableFactory}
      notifications={{} as any}
      overlays={{} as any}
      application={applicationMock}
      inspector={inspector}
      SavedObjectFinder={() => null}
      theme={theme}
    />
  );

  const titleExecute = jest.fn();
  component.setState((s: any) => ({
    ...s,
    universalActions: {
      ...s.universalActions,
      customizePanelTitle: { execute: titleExecute, isCompatible: jest.fn() },
    },
  }));

  const titleLink = findTestSubject(component, 'embeddablePanelTitleLink');
  expect(titleLink.length).toBe(1);
  titleLink.simulate('click');
  await nextTick();
  expect(titleExecute).toHaveBeenCalledTimes(1);
});

test('Updates when hidePanelTitles is toggled', async () => {
  const inspector = inspectorPluginMock.createStartContract();

  const container = new HelloWorldContainer(
    { id: '123', panels: {}, viewMode: ViewMode.VIEW, hidePanelTitles: false },
    { getEmbeddableFactory } as any
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
      <EmbeddablePanel
        embeddable={embeddable}
        getActions={() => Promise.resolve([])}
        getAllEmbeddableFactories={start.getEmbeddableFactories}
        getEmbeddableFactory={start.getEmbeddableFactory}
        notifications={{} as any}
        overlays={{} as any}
        application={applicationMock}
        inspector={inspector}
        SavedObjectFinder={() => null}
        theme={theme}
      />
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

test('Check when hide header option is false', async () => {
  const inspector = inspectorPluginMock.createStartContract();

  const container = new HelloWorldContainer(
    { id: '123', panels: {}, viewMode: ViewMode.VIEW, hidePanelTitles: false },
    { getEmbeddableFactory } as any
  );

  const embeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Arya',
    lastName: 'Stark',
  });

  const component = mount(
    <I18nProvider>
      <EmbeddablePanel
        embeddable={embeddable}
        getActions={() => Promise.resolve([])}
        getAllEmbeddableFactories={start.getEmbeddableFactories}
        getEmbeddableFactory={start.getEmbeddableFactory}
        notifications={{} as any}
        overlays={{} as any}
        application={applicationMock}
        inspector={inspector}
        SavedObjectFinder={() => null}
        hideHeader={false}
        theme={theme}
      />
    </I18nProvider>
  );

  const title = findTestSubject(component, `embeddablePanelHeading-HelloAryaStark`);
  expect(title.length).toBe(1);
});

test('Check when hide header option is true', async () => {
  const inspector = inspectorPluginMock.createStartContract();

  const container = new HelloWorldContainer(
    { id: '123', panels: {}, viewMode: ViewMode.VIEW, hidePanelTitles: false },
    { getEmbeddableFactory } as any
  );

  const embeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Arya',
    lastName: 'Stark',
  });

  const component = mount(
    <I18nProvider>
      <EmbeddablePanel
        embeddable={embeddable}
        getActions={() => Promise.resolve([])}
        getAllEmbeddableFactories={start.getEmbeddableFactories}
        getEmbeddableFactory={start.getEmbeddableFactory}
        notifications={{} as any}
        overlays={{} as any}
        application={{} as any}
        inspector={inspector}
        SavedObjectFinder={() => null}
        hideHeader={true}
        theme={theme}
      />
    </I18nProvider>
  );

  const title = findTestSubject(component, `embeddablePanelHeading-HelloAryaStark`);
  expect(title.length).toBe(0);
});

test('Should work in minimal way rendering only the inspector action', async () => {
  const inspector = inspectorPluginMock.createStartContract();
  inspector.isAvailable = jest.fn(() => true);

  const container = new HelloWorldContainer({ id: '123', panels: {}, viewMode: ViewMode.VIEW }, {
    getEmbeddableFactory,
  } as any);

  const embeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Arya',
    lastName: 'Stark',
  });

  const component = mount(
    <I18nProvider>
      <EmbeddablePanel
        embeddable={embeddable}
        getActions={() => Promise.resolve([])}
        inspector={inspector}
        hideHeader={false}
        theme={theme}
      />
    </I18nProvider>
  );

  findTestSubject(component, 'embeddablePanelToggleMenuIcon').simulate('click');
  expect(findTestSubject(component, `embeddablePanelContextMenuOpen`).length).toBe(1);
  await nextTick();
  component.update();
  expect(findTestSubject(component, `embeddablePanelAction-openInspector`).length).toBe(1);
  const action = findTestSubject(component, `embeddablePanelAction-ACTION_CUSTOMIZE_PANEL`);
  expect(action.length).toBe(0);
});
