/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { ReactWrapper, mount } from 'enzyme';
import { I18nProvider } from '@kbn/i18n-react';
import { nextTick } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
import { Action, UiActionsStart, ActionInternal, Trigger } from '@kbn/ui-actions-plugin/public';

import {
  ContactCardEmbeddable,
  CONTACT_CARD_EMBEDDABLE,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  ContactCardEmbeddableFactory,
  CONTACT_CARD_EMBEDDABLE_REACT,
  createEditModeActionDefinition,
  ContactCardEmbeddableReactFactory,
  HelloWorldContainer,
} from '../lib/test_samples';
import { EuiBadge, EuiNotificationBadge } from '@elastic/eui';
import { embeddablePluginMock } from '../mocks';
import { EmbeddablePanel } from './embeddable_panel';
import { core, inspector } from '../kibana_services';
import { CONTEXT_MENU_TRIGGER, ViewMode } from '..';
import { UnwrappedEmbeddablePanelProps } from './types';

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

actionRegistry.set(editModeAction.id, new ActionInternal(editModeAction));
triggerRegistry.set(trigger.id, trigger);
setup.registerEmbeddableFactory(embeddableFactory.type, embeddableFactory);
setup.registerEmbeddableFactory(embeddableReactFactory.type, embeddableReactFactory);

const start = doStart();
const getEmbeddableFactory = start.getEmbeddableFactory;

const renderEmbeddableInPanel = async (
  props: UnwrappedEmbeddablePanelProps
): Promise<ReactWrapper> => {
  let wrapper: ReactWrapper;
  await act(async () => {
    wrapper = mount(
      <I18nProvider>
        <EmbeddablePanel {...props} />
      </I18nProvider>
    );
  });
  return wrapper!;
};

const setupContainerAndEmbeddable = async (viewMode?: ViewMode, hidePanelTitles?: boolean) => {
  const container = new HelloWorldContainer(
    { id: '123', panels: {}, viewMode: viewMode ?? ViewMode.VIEW, hidePanelTitles },
    {
      getEmbeddableFactory,
    } as any
  );

  const embeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Jack',
    lastName: 'Orange',
  });

  return { container, embeddable };
};

const renderInEditModeAndOpenContextMenu = async ({
  embeddableInputs,
  getActions = () => Promise.resolve([]),
  showNotifications = true,
  showBadges = true,
}: {
  embeddableInputs: any;
  getActions?: UiActionsStart['getTriggerCompatibleActions'];
  showNotifications?: boolean;
  showBadges?: boolean;
}) => {
  const container = new HelloWorldContainer({ id: '123', panels: {}, viewMode: ViewMode.VIEW }, {
    getEmbeddableFactory,
  } as any);

  const embeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, embeddableInputs);

  let component: ReactWrapper;
  await act(async () => {
    component = mount(
      <I18nProvider>
        <EmbeddablePanel
          embeddable={embeddable}
          getActions={getActions}
          showNotifications={showNotifications}
          showBadges={showBadges}
        />
      </I18nProvider>
    );
  });

  findTestSubject(component!, 'embeddablePanelToggleMenuIcon').simulate('click');
  await nextTick();
  component!.update();

  return { component: component! };
};

describe('Error states', () => {
  let component: ReactWrapper<unknown>;
  let embeddable: ContactCardEmbeddable;

  beforeEach(async () => {
    const container = new HelloWorldContainer({ id: '123', panels: {}, viewMode: ViewMode.VIEW }, {
      getEmbeddableFactory,
    } as any);

    embeddable = (await container.addNewEmbeddable<
      ContactCardEmbeddableInput,
      ContactCardEmbeddableOutput,
      ContactCardEmbeddable
    >(CONTACT_CARD_EMBEDDABLE, {})) as ContactCardEmbeddable;

    await act(async () => {
      component = mount(
        <I18nProvider>
          <EmbeddablePanel embeddable={embeddable} />
        </I18nProvider>
      );
    });

    jest.spyOn(embeddable, 'catchError');
  });

  test('renders a custom error', () => {
    act(() => {
      embeddable.triggerError(new Error('something'));
      component.update();
      component.mount();
    });

    const embeddableError = findTestSubject(component, 'embeddableError');

    expect(embeddable.catchError).toHaveBeenCalledWith(
      new Error('something'),
      expect.any(HTMLElement)
    );
    expect(embeddableError).toHaveProperty('length', 1);
    expect(embeddableError.text()).toBe('something');
  });

  test('renders a custom fatal error', () => {
    act(() => {
      embeddable.triggerError(new Error('something'));
      component.update();
      component.mount();
    });

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
    act(() => {
      embeddable.triggerError(new Error('something'));
      component.update();
      component.mount();
    });
    act(() => {
      embeddable.triggerError(new Error('another error'));
      component.update();
      component.mount();
    });

    const embeddableError = findTestSubject(component, 'embeddableError');

    expect(embeddableError).toHaveProperty('length', 1);
    expect(embeddableError.text()).toBe('another error');
    expect(destroyError!).toHaveBeenCalledTimes(1);
  });

  test('renders a default error', async () => {
    embeddable.catchError = undefined;
    act(() => {
      embeddable.triggerError(new Error('something'));
      component.update();
      component.mount();
    });

    const embeddableError = findTestSubject(component, 'embeddableError');

    expect(embeddableError).toHaveProperty('length', 1);
    expect(embeddableError.children.length).toBeGreaterThan(0);
  });

  test('renders a React node', () => {
    (embeddable.catchError as jest.Mock).mockReturnValueOnce(<div>Something</div>);
    act(() => {
      embeddable.triggerError(new Error('something'));
      component.update();
      component.mount();
    });

    const embeddableError = findTestSubject(component, 'embeddableError');

    expect(embeddableError).toHaveProperty('length', 1);
    expect(embeddableError.text()).toBe('Something');
  });
});

test('Render method is called on Embeddable', async () => {
  const { embeddable } = await setupContainerAndEmbeddable();
  jest.spyOn(embeddable, 'render');
  await renderEmbeddableInPanel({ embeddable });
  expect(embeddable.render).toHaveBeenCalledTimes(1);
});

test('Actions which are disabled via disabledActions are hidden', async () => {
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

  const { component: component1 } = await renderInEditModeAndOpenContextMenu({
    embeddableInputs: {
      firstName: 'Bob',
    },
    getActions,
  });
  const { component: component2 } = await renderInEditModeAndOpenContextMenu({
    embeddableInputs: {
      firstName: 'Bob',
      disabledActions: ['FOO'],
    },
    getActions,
  });

  const fooContextMenuActionItem1 = findTestSubject(component1, 'embeddablePanelAction-FOO');
  const fooContextMenuActionItem2 = findTestSubject(component2, 'embeddablePanelAction-FOO');

  expect(fooContextMenuActionItem1.length).toBe(1);
  expect(fooContextMenuActionItem2.length).toBe(0);
});

test('Badges which are disabled via disabledActions are hidden', async () => {
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

  const { component: component1 } = await renderInEditModeAndOpenContextMenu({
    embeddableInputs: {
      firstName: 'Bob',
    },
    getActions,
  });
  const { component: component2 } = await renderInEditModeAndOpenContextMenu({
    embeddableInputs: {
      firstName: 'Bob',
      disabledActions: ['BAR'],
    },
    getActions,
  });

  expect(component1.find(EuiBadge).length).toBe(1);
  expect(component2.find(EuiBadge).length).toBe(0);
});

test('Badges are not shown when hideBadges is true', async () => {
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

  const { component } = await renderInEditModeAndOpenContextMenu({
    embeddableInputs: {
      firstName: 'Bob',
    },
    getActions,
    showBadges: false,
  });
  expect(component.find(EuiBadge).length).toBe(0);
  expect(component.find(EuiNotificationBadge).length).toBe(1);
});

test('Notifications are not shown when hideNotifications is true', async () => {
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

  const { component } = await renderInEditModeAndOpenContextMenu({
    embeddableInputs: {
      firstName: 'Bob',
    },
    getActions,
    showNotifications: false,
  });

  expect(component.find(EuiBadge).length).toBe(1);
  expect(component.find(EuiNotificationBadge).length).toBe(0);
});

test('Edit mode actions are hidden if parent is in view mode', async () => {
  const { embeddable } = await setupContainerAndEmbeddable();

  const component = await renderEmbeddableInPanel({ embeddable });

  await act(async () => {
    findTestSubject(component, 'embeddablePanelToggleMenuIcon').simulate('click');
    await nextTick();
    component.update();
  });
  expect(findTestSubject(component, `embeddablePanelContextMenuOpen`).length).toBe(1);
  await nextTick();
  component.update();
  expect(findTestSubject(component, `embeddablePanelAction-${editModeAction.id}`).length).toBe(0);
});

test('Edit mode actions are shown in edit mode', async () => {
  const { container, embeddable } = await setupContainerAndEmbeddable();

  const component = await renderEmbeddableInPanel({ embeddable });

  const button = findTestSubject(component, 'embeddablePanelToggleMenuIcon');

  expect(button.length).toBe(1);
  await act(async () => {
    findTestSubject(component, 'embeddablePanelToggleMenuIcon').simulate('click');
    await nextTick();
    component.update();
  });
  expect(findTestSubject(component, `embeddablePanelContextMenuOpen`).length).toBe(1);
  await nextTick();
  act(() => {
    component.update();
  });
  expect(findTestSubject(component, `embeddablePanelAction-${editModeAction.id}`).length).toBe(0);

  await act(async () => {
    container.updateInput({ viewMode: ViewMode.EDIT });
    await nextTick();
    component.update();
  });

  // Need to close and re-open to refresh. It doesn't update automatically.
  await act(async () => {
    findTestSubject(component, 'embeddablePanelToggleMenuIcon').simulate('click');
    await nextTick();
    findTestSubject(component, 'embeddablePanelToggleMenuIcon').simulate('click');
    await nextTick();
    component.update();
  });
  expect(findTestSubject(component, 'embeddablePanelContextMenuOpen').length).toBe(1);

  await act(async () => {
    container.updateInput({ viewMode: ViewMode.VIEW });
    await nextTick();
    component.update();
  });

  // TODO: Fix this.
  // const action = findTestSubject(component, `embeddablePanelAction-${editModeAction.id}`);
  // expect(action.length).toBe(1);
});

test('Panel title customize link does not exist in view mode', async () => {
  const { embeddable } = await setupContainerAndEmbeddable(ViewMode.VIEW, false);

  const component = await renderEmbeddableInPanel({ embeddable });

  const titleLink = findTestSubject(component, 'embeddablePanelTitleLink');
  expect(titleLink.length).toBe(0);
});

test('Runs customize panel action on title click when in edit mode', async () => {
  // spy on core openFlyout to check that the flyout is opened correctly.
  core.overlays.openFlyout = jest.fn();

  const { embeddable } = await setupContainerAndEmbeddable(ViewMode.EDIT, false);

  const component = await renderEmbeddableInPanel({ embeddable });

  const titleLink = findTestSubject(component, 'embeddablePanelTitleLink');
  expect(titleLink.length).toBe(1);
  act(() => {
    titleLink.simulate('click');
  });
  await nextTick();
  expect(core.overlays.openFlyout).toHaveBeenCalledTimes(1);
  expect(core.overlays.openFlyout).toHaveBeenCalledWith(
    expect.any(Function),
    expect.objectContaining({ 'data-test-subj': 'customizePanel' })
  );
});

test('Updates when hidePanelTitles is toggled', async () => {
  const { container, embeddable } = await setupContainerAndEmbeddable(ViewMode.VIEW, false);
  const component = await renderEmbeddableInPanel({ embeddable });

  await component.update();
  let title = findTestSubject(component, `embeddablePanelHeading-HelloJackOrange`);
  expect(title.length).toBe(1);

  await act(async () => {
    await container.updateInput({ hidePanelTitles: true });
  });

  await nextTick();
  await component.update();
  title = findTestSubject(component, `embeddablePanelHeading-HelloJackOrange`);
  expect(title.length).toBe(0);

  await act(async () => {
    await container.updateInput({ hidePanelTitles: false });
    await nextTick();
    component.update();
  });

  title = findTestSubject(component, `embeddablePanelHeading-HelloJackOrange`);
  expect(title.length).toBe(1);
});

test('Respects options from SelfStyledEmbeddable', async () => {
  const { container, embeddable } = await setupContainerAndEmbeddable(ViewMode.VIEW, false);

  const selfStyledEmbeddable = embeddablePluginMock.mockSelfStyledEmbeddable(embeddable, {
    hideTitle: true,
  });

  // make sure the title is being hidden because of the self styling, not the container
  container.updateInput({ hidePanelTitles: false });

  const component = await renderEmbeddableInPanel({ embeddable: selfStyledEmbeddable });

  const title = findTestSubject(component, `embeddablePanelHeading-HelloJackOrange`);
  expect(title.length).toBe(0);
});

test('Does not hide header when parent hide header option is false', async () => {
  const { embeddable } = await setupContainerAndEmbeddable(ViewMode.VIEW, false);

  const component = await renderEmbeddableInPanel({ embeddable });

  const title = findTestSubject(component, `embeddablePanelHeading-HelloJackOrange`);
  expect(title.length).toBe(1);
});

test('Hides title when parent hide header option is true', async () => {
  const { embeddable } = await setupContainerAndEmbeddable(ViewMode.VIEW, true);

  const component = await renderEmbeddableInPanel({ embeddable });

  const title = findTestSubject(component, `embeddablePanelHeading-HelloJackOrange`);
  expect(title.length).toBe(0);
});

test('Should work in minimal way rendering only the inspector action', async () => {
  inspector.isAvailable = jest.fn(() => true);

  const { embeddable } = await setupContainerAndEmbeddable(ViewMode.VIEW, true);

  const component = await renderEmbeddableInPanel({ embeddable });

  await act(async () => {
    findTestSubject(component, 'embeddablePanelToggleMenuIcon').simulate('click');
    await nextTick();
    component.update();
  });

  expect(findTestSubject(component, `embeddablePanelContextMenuOpen`).length).toBe(1);
  await act(async () => {
    await nextTick();
    component.update();
  });
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

  const component = await renderEmbeddableInPanel({ embeddable });

  expect(component.find('.embPanel__titleText').text()).toBe('Hello Bran Stark');
});
