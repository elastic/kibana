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
import { I18nProvider } from '@kbn/i18n-react';
import {
  CONTEXT_MENU_TRIGGER,
  EmbeddablePanel,
  isErrorEmbeddable,
  ViewMode,
} from '@kbn/embeddable-plugin/public';
import {
  ContactCardEmbeddable,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  CONTACT_CARD_EMBEDDABLE,
  EMPTY_EMBEDDABLE,
} from '@kbn/embeddable-plugin/public/lib/test_samples/embeddables';
import { applicationServiceMock, coreMock } from '@kbn/core/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { createEditModeActionDefinition } from '@kbn/embeddable-plugin/public/lib/test_samples';

import { DashboardContainer } from './dashboard_container';
import { getSampleDashboardInput, getSampleDashboardPanel } from '../../mocks';
import { pluginServices } from '../../services/plugin_services';
import { ApplicationStart } from '@kbn/core-application-browser';

const theme = coreMock.createStart().theme;
let application: ApplicationStart | undefined;

const embeddableFactory = new ContactCardEmbeddableFactory((() => null) as any, {} as any);
pluginServices.getServices().embeddable.getEmbeddableFactory = jest
  .fn()
  .mockReturnValue(embeddableFactory);

beforeEach(() => {
  application = applicationServiceMock.createStartContract();
});

test('DashboardContainer initializes embeddables', (done) => {
  const initialInput = getSampleDashboardInput({
    panels: {
      '123': getSampleDashboardPanel<ContactCardEmbeddableInput>({
        explicitInput: { firstName: 'Sam', id: '123' },
        type: CONTACT_CARD_EMBEDDABLE,
      }),
    },
  });
  const container = new DashboardContainer(initialInput);

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
  const container = new DashboardContainer(getSampleDashboardInput());
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

test('DashboardContainer.replacePanel', (done) => {
  const ID = '123';
  const initialInput = getSampleDashboardInput({
    panels: {
      [ID]: getSampleDashboardPanel<ContactCardEmbeddableInput>({
        explicitInput: { firstName: 'Sam', id: ID },
        type: CONTACT_CARD_EMBEDDABLE,
      }),
    },
  });

  const container = new DashboardContainer(initialInput);
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

test('Container view mode change propagates to existing children', async () => {
  const initialInput = getSampleDashboardInput({
    panels: {
      '123': getSampleDashboardPanel<ContactCardEmbeddableInput>({
        explicitInput: { firstName: 'Sam', id: '123' },
        type: CONTACT_CARD_EMBEDDABLE,
      }),
    },
  });
  const container = new DashboardContainer(initialInput);

  const embeddable = await container.untilEmbeddableLoaded('123');
  expect(embeddable.getInput().viewMode).toBe(ViewMode.VIEW);
  container.updateInput({ viewMode: ViewMode.EDIT });
  expect(embeddable.getInput().viewMode).toBe(ViewMode.EDIT);
});

test('Container view mode change propagates to new children', async () => {
  const container = new DashboardContainer(getSampleDashboardInput());
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
    getSampleDashboardInput({ searchSessionId: searchSessionId1 })
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
  const uiActionsSetup = uiActionsPluginMock.createSetupContract();

  const editModeAction = createEditModeActionDefinition();
  uiActionsSetup.registerAction(editModeAction);
  uiActionsSetup.addTriggerAction(CONTEXT_MENU_TRIGGER, editModeAction);

  const initialInput = getSampleDashboardInput({ viewMode: ViewMode.VIEW });
  const container = new DashboardContainer(initialInput);

  const embeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Bob',
  });

  const DashboardServicesProvider = pluginServices.getContextProvider();

  const component = mount(
    <I18nProvider>
      <DashboardServicesProvider>
        <EmbeddablePanel
          embeddable={embeddable}
          getActions={() => Promise.resolve([])}
          getAllEmbeddableFactories={(() => []) as any}
          getEmbeddableFactory={(() => null) as any}
          notifications={{} as any}
          application={application}
          SavedObjectFinder={() => null}
          theme={theme}
        />
      </DashboardServicesProvider>
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
