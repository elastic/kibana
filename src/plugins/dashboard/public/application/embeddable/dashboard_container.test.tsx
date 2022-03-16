/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount } from 'enzyme';

import { findTestSubject, nextTick } from '@kbn/test-jest-helpers';
import { DashboardContainer, DashboardContainerServices } from './dashboard_container';
import { getSampleDashboardInput, getSampleDashboardPanel } from '../test_helpers';
import { I18nProvider } from '@kbn/i18n-react';
import { embeddablePluginMock } from 'src/plugins/embeddable/public/mocks';

import { KibanaContextProvider } from '../../services/kibana_react';
import {
  CONTEXT_MENU_TRIGGER,
  EmbeddablePanel,
  isErrorEmbeddable,
  ViewMode,
} from '../../services/embeddable';
import {
  CONTACT_CARD_EMBEDDABLE,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddableInput,
  ContactCardEmbeddable,
  EMPTY_EMBEDDABLE,
  ContactCardEmbeddableOutput,
  createEditModeAction,
} from '../../services/embeddable_test_samples';
import {
  applicationServiceMock,
  coreMock,
  uiSettingsServiceMock,
} from '../../../../../core/public/mocks';
import { inspectorPluginMock } from '../../../../inspector/public/mocks';
import { uiActionsPluginMock } from '../../../../ui_actions/public/mocks';
import { getStubPluginServices } from '../../../../presentation_util/public';

const presentationUtil = getStubPluginServices();
const theme = coreMock.createStart().theme;

const options: DashboardContainerServices = {
  // TODO: clean up use of any
  application: {} as any,
  embeddable: {} as any,
  notifications: {} as any,
  overlays: {} as any,
  inspector: {} as any,
  screenshotMode: {} as any,
  SavedObjectFinder: () => null,
  ExitFullScreenButton: () => null,
  uiActions: {} as any,
  uiSettings: uiSettingsServiceMock.createStartContract(),
  http: coreMock.createStart().http,
  theme,
  presentationUtil,
};

beforeEach(() => {
  const { setup, doStart } = embeddablePluginMock.createInstance();
  setup.registerEmbeddableFactory(
    CONTACT_CARD_EMBEDDABLE,
    new ContactCardEmbeddableFactory((() => null) as any, {} as any)
  );
  options.embeddable = doStart();
  options.application = applicationServiceMock.createStartContract();
});

test('DashboardContainer initializes embeddables', async (done) => {
  const initialInput = getSampleDashboardInput({
    panels: {
      '123': getSampleDashboardPanel<ContactCardEmbeddableInput>({
        explicitInput: { firstName: 'Sam', id: '123' },
        type: CONTACT_CARD_EMBEDDABLE,
      }),
    },
  });
  const container = new DashboardContainer(initialInput, options);

  const subscription = container.getOutput$().subscribe((output) => {
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

test('DashboardContainer.addNewEmbeddable', async () => {
  const container = new DashboardContainer(getSampleDashboardInput(), options);
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

test('DashboardContainer.replacePanel', async (done) => {
  const ID = '123';
  const initialInput = getSampleDashboardInput({
    panels: {
      [ID]: getSampleDashboardPanel<ContactCardEmbeddableInput>({
        explicitInput: { firstName: 'Sam', id: ID },
        type: CONTACT_CARD_EMBEDDABLE,
      }),
    },
  });

  const container = new DashboardContainer(initialInput, options);
  let counter = 0;

  const subscription = container.getInput$().subscribe(
    jest.fn(({ panels }) => {
      counter++;
      expect(panels[ID]).toBeDefined();
      // It should be called exactly 2 times and exit the second time
      switch (counter) {
        case 1:
          return expect(panels[ID].type).toBe(CONTACT_CARD_EMBEDDABLE);

        case 2: {
          expect(panels[ID].type).toBe(EMPTY_EMBEDDABLE);
          subscription.unsubscribe();
          done();
          return;
        }

        default:
          throw Error('Called too many times!');
      }
    })
  );

  // replace the panel now
  container.replacePanel(container.getInput().panels[ID], {
    type: EMPTY_EMBEDDABLE,
    explicitInput: { id: ID },
  });
});

test('Container view mode change propagates to existing children', async (done) => {
  const initialInput = getSampleDashboardInput({
    panels: {
      '123': getSampleDashboardPanel<ContactCardEmbeddableInput>({
        explicitInput: { firstName: 'Sam', id: '123' },
        type: CONTACT_CARD_EMBEDDABLE,
      }),
    },
  });
  const container = new DashboardContainer(initialInput, options);

  const embeddable = await container.untilEmbeddableLoaded('123');
  expect(embeddable.getInput().viewMode).toBe(ViewMode.VIEW);
  container.updateInput({ viewMode: ViewMode.EDIT });
  expect(embeddable.getInput().viewMode).toBe(ViewMode.EDIT);
  done();
});

test('Container view mode change propagates to new children', async () => {
  const container = new DashboardContainer(getSampleDashboardInput(), options);
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

test('searchSessionId propagates to children', async () => {
  const searchSessionId1 = 'searchSessionId1';
  const container = new DashboardContainer(
    getSampleDashboardInput({ searchSessionId: searchSessionId1 }),
    options
  );
  const embeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Bob',
  });

  expect(embeddable.getInput().searchSessionId).toBe(searchSessionId1);

  const searchSessionId2 = 'searchSessionId2';
  container.updateInput({ searchSessionId: searchSessionId2 });

  expect(embeddable.getInput().searchSessionId).toBe(searchSessionId2);
});

test('DashboardContainer in edit mode shows edit mode actions', async () => {
  const inspector = inspectorPluginMock.createStartContract();
  const uiActionsSetup = uiActionsPluginMock.createSetupContract();

  const editModeAction = createEditModeAction();
  uiActionsSetup.registerAction(editModeAction);
  uiActionsSetup.addTriggerAction(CONTEXT_MENU_TRIGGER, editModeAction);

  const initialInput = getSampleDashboardInput({ viewMode: ViewMode.VIEW });
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
        <presentationUtil.ContextProvider>
          <EmbeddablePanel
            embeddable={embeddable}
            getActions={() => Promise.resolve([])}
            getAllEmbeddableFactories={(() => []) as any}
            getEmbeddableFactory={(() => null) as any}
            notifications={{} as any}
            application={options.application}
            overlays={{} as any}
            inspector={inspector}
            SavedObjectFinder={() => null}
            theme={theme}
          />
        </presentationUtil.ContextProvider>
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
