/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mount, ReactWrapper } from 'enzyme';

import {
  ViewMode,
  EmbeddablePanel,
  isErrorEmbeddable,
  CONTEXT_MENU_TRIGGER,
} from '@kbn/embeddable-plugin/public';
import {
  EMPTY_EMBEDDABLE,
  ContactCardEmbeddable,
  CONTACT_CARD_EMBEDDABLE,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  ContactCardEmbeddableFactory,
} from '@kbn/embeddable-plugin/public/lib/test_samples/embeddables';
import { I18nProvider } from '@kbn/i18n-react';
import type { TimeRange } from '@kbn/es-query';
import { findTestSubject, nextTick } from '@kbn/test-jest-helpers';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { setStubKibanaServices } from '@kbn/embeddable-plugin/public/mocks';
import { mockedReduxEmbeddablePackage } from '@kbn/presentation-util-plugin/public/mocks';
import { createEditModeActionDefinition } from '@kbn/embeddable-plugin/public/lib/test_samples';

import { DashboardContainer } from './dashboard_container';
import { pluginServices } from '../../services/plugin_services';
import { buildMockDashboard, getSampleDashboardInput, getSampleDashboardPanel } from '../../mocks';

const embeddableFactory = new ContactCardEmbeddableFactory((() => null) as any, {} as any);
pluginServices.getServices().embeddable.getEmbeddableFactory = jest
  .fn()
  .mockReturnValue(embeddableFactory);

test('DashboardContainer initializes embeddables', (done) => {
  const container = buildMockDashboard({
    panels: {
      '123': getSampleDashboardPanel<ContactCardEmbeddableInput>({
        explicitInput: { firstName: 'Sam', id: '123' },
        type: CONTACT_CARD_EMBEDDABLE,
      }),
    },
  });

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
  const container = buildMockDashboard();
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

  const container = buildMockDashboard({
    panels: {
      [ID]: getSampleDashboardPanel<ContactCardEmbeddableInput>({
        explicitInput: { firstName: 'Sam', id: ID },
        type: CONTACT_CARD_EMBEDDABLE,
      }),
    },
  });
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
  const container = buildMockDashboard({
    panels: {
      '123': getSampleDashboardPanel<ContactCardEmbeddableInput>({
        explicitInput: { firstName: 'Sam', id: '123' },
        type: CONTACT_CARD_EMBEDDABLE,
      }),
    },
  });

  const embeddable = await container.untilEmbeddableLoaded('123');
  expect(embeddable.getInput().viewMode).toBe(ViewMode.VIEW);
  container.updateInput({ viewMode: ViewMode.EDIT });
  expect(embeddable.getInput().viewMode).toBe(ViewMode.EDIT);
});

test('Container view mode change propagates to new children', async () => {
  const container = buildMockDashboard();
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
    getSampleDashboardInput(),
    mockedReduxEmbeddablePackage,
    searchSessionId1
  );
  const embeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Bob',
  });

  expect(embeddable.getInput().searchSessionId).toBe(searchSessionId1);
});

test('DashboardContainer in edit mode shows edit mode actions', async () => {
  // mock embeddable dependencies so that the embeddable panel renders
  setStubKibanaServices();
  const uiActionsSetup = uiActionsPluginMock.createSetupContract();

  const editModeAction = createEditModeActionDefinition();
  uiActionsSetup.registerAction(editModeAction);
  uiActionsSetup.addTriggerAction(CONTEXT_MENU_TRIGGER, editModeAction);

  const container = buildMockDashboard({ viewMode: ViewMode.VIEW });

  const embeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Bob',
  });

  let wrapper: ReactWrapper;
  await act(async () => {
    wrapper = await mount(
      <I18nProvider>
        <EmbeddablePanel embeddable={embeddable} />
      </I18nProvider>
    );
  });
  const component = wrapper!;
  await component.update();
  await nextTick();

  const button = findTestSubject(component, 'embeddablePanelToggleMenuIcon');

  expect(button.length).toBe(1);
  act(() => {
    findTestSubject(component, 'embeddablePanelToggleMenuIcon').simulate('click');
  });
  await nextTick();
  await component.update();

  expect(findTestSubject(component, `embeddablePanelContextMenuOpen`).length).toBe(1);

  const editAction = findTestSubject(component, `embeddablePanelAction-${editModeAction.id}`);

  expect(editAction.length).toBe(0);

  act(() => {
    container.updateInput({ viewMode: ViewMode.EDIT });
  });
  await nextTick();
  await component.update();

  act(() => {
    findTestSubject(component, 'embeddablePanelToggleMenuIcon').simulate('click');
  });
  await nextTick();
  component.update();

  expect(findTestSubject(component, 'embeddablePanelContextMenuOpen').length).toBe(0);

  act(() => {
    findTestSubject(component, 'embeddablePanelToggleMenuIcon').simulate('click');
  });
  await nextTick();
  component.update();

  expect(findTestSubject(component, 'embeddablePanelContextMenuOpen').length).toBe(1);

  await nextTick();
  component.update();

  // TODO: Address this.
  // const action = findTestSubject(component, `embeddablePanelAction-${editModeAction.id}`);
  // expect(action.length).toBe(1);
});

describe('getInheritedInput', () => {
  const dashboardTimeRange = {
    to: 'now',
    from: 'now-15m',
  };
  const dashboardTimeslice = [1688061910000, 1688062209000] as [number, number];

  test('Should pass dashboard timeRange and timeslice to panel when panel does not have custom time range', async () => {
    const container = buildMockDashboard({
      timeRange: dashboardTimeRange,
      timeslice: dashboardTimeslice,
    });
    const embeddable = await container.addNewEmbeddable<ContactCardEmbeddableInput>(
      CONTACT_CARD_EMBEDDABLE,
      {
        firstName: 'Kibana',
      }
    );
    expect(embeddable).toBeDefined();

    const embeddableInput = container
      .getChild<ContactCardEmbeddable>(embeddable.id)
      .getInput() as ContactCardEmbeddableInput & {
      timeRange: TimeRange;
      timeslice: [number, number];
    };
    expect(embeddableInput.timeRange).toEqual(dashboardTimeRange);
    expect(embeddableInput.timeslice).toEqual(dashboardTimeslice);
  });

  test('Should not pass dashboard timeRange and timeslice to panel when panel has custom time range', async () => {
    const container = buildMockDashboard({
      timeRange: dashboardTimeRange,
      timeslice: dashboardTimeslice,
    });
    const embeddableTimeRange = {
      to: 'now',
      from: 'now-24h',
    };
    const embeddable = await container.addNewEmbeddable<
      ContactCardEmbeddableInput & { timeRange: TimeRange }
    >(CONTACT_CARD_EMBEDDABLE, {
      firstName: 'Kibana',
      timeRange: embeddableTimeRange,
    });

    const embeddableInput = container
      .getChild<ContactCardEmbeddable>(embeddable.id)
      .getInput() as ContactCardEmbeddableInput & {
      timeRange: TimeRange;
      timeslice: [number, number];
    };
    expect(embeddableInput.timeRange).toEqual(embeddableTimeRange);
    expect(embeddableInput.timeslice).toBeUndefined();
  });
});
