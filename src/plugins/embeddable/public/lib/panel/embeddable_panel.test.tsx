/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ReactWrapper, mount } from 'enzyme';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';

import { findTestSubject } from '@elastic/eui/lib/test';
import { I18nProvider } from '@kbn/i18n-react';
import { CONTEXT_MENU_TRIGGER } from '../triggers';
import { Action, UiActionsStart, ActionInternal } from '@kbn/ui-actions-plugin/public';
import { Trigger, ViewMode } from '../types';
import { isErrorEmbeddable } from '../embeddables';
import { EmbeddablePanel } from './embeddable_panel';
import {
  createEditModeActionDefinition,
  ContactCardEmbeddable,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddableReactFactory,
  CONTACT_CARD_EMBEDDABLE,
  CONTACT_CARD_EMBEDDABLE_REACT,
  HelloWorldContainer,
} from '../test_samples';
import { inspectorPluginMock } from '@kbn/inspector-plugin/public/mocks';
import { EuiBadge } from '@elastic/eui';
import { embeddablePluginMock } from '../../mocks';
import { applicationServiceMock, themeServiceMock } from '@kbn/core/public/mocks';

const actionRegistry = new Map<string, Action>();
const triggerRegistry = new Map<string, Trigger>();

const { setup, doStart } = embeddablePluginMock.createInstance();

const editModeAction = createEditModeActionDefinition();
const trigger: Trigger = {
  id: CONTEXT_MENU_TRIGGER,
};
const embeddableFactory = new ContactCardEmbeddableFactory((() => null) as any, {} as any);
const embeddableReactFactory = new ContactCardEmbeddableReactFactory(
  (() => null) as any,
  {} as any
);
const applicationMock = applicationServiceMock.createStartContract();
const theme = themeServiceMock.createStartContract();

actionRegistry.set(editModeAction.id, new ActionInternal(editModeAction));
triggerRegistry.set(trigger.id, trigger);
setup.registerEmbeddableFactory(embeddableFactory.type, embeddableFactory);
setup.registerEmbeddableFactory(embeddableReactFactory.type, embeddableReactFactory);

const start = doStart();
const getEmbeddableFactory = start.getEmbeddableFactory;
test('HelloWorldContainer initializes embeddables', (done) => {
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

describe('HelloWorldContainer in error state', () => {
  let component: ReactWrapper<unknown>;
  let embeddable: ContactCardEmbeddable;

  beforeEach(async () => {
    const inspector = inspectorPluginMock.createStartContract();
    const container = new HelloWorldContainer({ id: '123', panels: {}, viewMode: ViewMode.VIEW }, {
      getEmbeddableFactory,
    } as any);

    embeddable = (await container.addNewEmbeddable<
      ContactCardEmbeddableInput,
      ContactCardEmbeddableOutput,
      ContactCardEmbeddable
    >(CONTACT_CARD_EMBEDDABLE, {})) as ContactCardEmbeddable;

    component = mount(
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

    jest.spyOn(embeddable, 'catchError');
  });

  test('renders a custom error', () => {
    embeddable.triggerError(new Error('something'));
    component.update();

    const embeddableError = findTestSubject(component, 'embeddableError');

    expect(embeddable.catchError).toHaveBeenCalledWith(
      new Error('something'),
      expect.any(HTMLElement)
    );
    expect(embeddableError).toHaveProperty('length', 1);
    expect(embeddableError.text()).toBe('something');
  });

  test('renders a custom fatal error', () => {
    embeddable.triggerError(new Error('something'), true);
    component.update();
    component.mount();

    const embeddableError = findTestSubject(component, 'embeddableError');

    expect(embeddable.catchError).toHaveBeenCalledWith(
      new Error('something'),
      expect.any(HTMLElement)
    );
    expect(embeddableError).toHaveProperty('length', 1);
    expect(embeddableError.text()).toBe('something');
  });

  test('destroys previous error', () => {
    const { catchError } = embeddable as Required<typeof embeddable>;
    let destroyError: jest.MockedFunction<ReturnType<typeof catchError>>;

    (embeddable.catchError as jest.MockedFunction<typeof catchError>).mockImplementationOnce(
      (...args) => {
        destroyError = jest.fn(catchError(...args));

        return destroyError;
      }
    );
    embeddable.triggerError(new Error('something'));
    component.update();
    embeddable.triggerError(new Error('another error'));
    component.update();

    const embeddableError = findTestSubject(component, 'embeddableError');

    expect(embeddableError).toHaveProperty('length', 1);
    expect(embeddableError.text()).toBe('another error');
    expect(destroyError!).toHaveBeenCalledTimes(1);
  });

  test('renders a default error', async () => {
    embeddable.catchError = undefined;
    embeddable.triggerError(new Error('something'));
    component.update();

    const embeddableError = findTestSubject(component, 'embeddableError');

    expect(embeddableError).toHaveProperty('length', 1);
    expect(embeddableError.children.length).toBeGreaterThan(0);
  });

  test('renders a React node', () => {
    (embeddable.catchError as jest.Mock).mockReturnValueOnce(<div>Something</div>);
    embeddable.triggerError(new Error('something'));
    component.update();

    const embeddableError = findTestSubject(component, 'embeddableError');

    expect(embeddableError).toHaveProperty('length', 1);
    expect(embeddableError.text()).toBe('Something');
  });
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
      customizePanel: { execute: titleExecute, isCompatible: jest.fn() },
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

test('Respects options from SelfStyledEmbeddable', async () => {
  const inspector = inspectorPluginMock.createStartContract();

  const container = new HelloWorldContainer(
    { id: '123', panels: {}, viewMode: ViewMode.VIEW, hidePanelTitles: false },
    { getEmbeddableFactory } as any
  );

  const contactCardEmbeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Rob',
    lastName: 'Stark',
  });

  const selfStyledEmbeddable = embeddablePluginMock.mockSelfStyledEmbeddable(
    contactCardEmbeddable,
    { hideTitle: true }
  );

  // make sure the title is being hidden because of the self styling, not the container
  container.updateInput({ hidePanelTitles: false });

  const component = mount(
    <I18nProvider>
      <EmbeddablePanel
        embeddable={selfStyledEmbeddable}
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

  const title = findTestSubject(component, `embeddablePanelHeading-HelloRobStark`);
  expect(title.length).toBe(0);
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

test('Renders an embeddable returning a React node', async () => {
  const container = new HelloWorldContainer(
    { id: '123', panels: {}, viewMode: ViewMode.VIEW, hidePanelTitles: false },
    { getEmbeddableFactory } as any
  );

  const embeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE_REACT, {
    firstName: 'Bran',
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
        SavedObjectFinder={() => null}
        theme={theme}
      />
    </I18nProvider>
  );

  expect(component.find('.embPanel__titleText').text()).toBe('Hello Bran Stark');
});
