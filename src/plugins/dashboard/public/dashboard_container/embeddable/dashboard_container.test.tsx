/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isErrorEmbeddable, ViewMode } from '@kbn/embeddable-plugin/public';
import {
  ContactCardEmbeddable,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  CONTACT_CARD_EMBEDDABLE,
  EMPTY_EMBEDDABLE,
} from '@kbn/embeddable-plugin/public/lib/test_samples/embeddables';
import type { TimeRange } from '@kbn/es-query';
import { mockedReduxEmbeddablePackage } from '@kbn/presentation-util-plugin/public/mocks';

import {
  buildMockDashboard,
  getSampleDashboardInput,
  getSampleDashboardPanel,
  mockControlGroupApi,
} from '../../mocks';
import { pluginServices } from '../../services/plugin_services';
import { DashboardContainer } from './dashboard_container';

const embeddableFactory = new ContactCardEmbeddableFactory((() => null) as any, {} as any);
pluginServices.getServices().embeddable.getEmbeddableFactory = jest
  .fn()
  .mockReturnValue(embeddableFactory);

test('DashboardContainer initializes embeddables', (done) => {
  const container = buildMockDashboard({
    overrides: {
      panels: {
        '123': getSampleDashboardPanel<ContactCardEmbeddableInput>({
          explicitInput: { firstName: 'Sam', id: '123' },
          type: CONTACT_CARD_EMBEDDABLE,
        }),
      },
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
    overrides: {
      panels: {
        [ID]: getSampleDashboardPanel<ContactCardEmbeddableInput>({
          explicitInput: { firstName: 'Sam', id: ID },
          type: CONTACT_CARD_EMBEDDABLE,
        }),
      },
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
  container.replaceEmbeddable(
    container.getInput().panels[ID].explicitInput.id,
    { id: ID },
    EMPTY_EMBEDDABLE
  );
});

test('Container view mode change propagates to existing children', async () => {
  const container = buildMockDashboard({
    overrides: {
      panels: {
        '123': getSampleDashboardPanel<ContactCardEmbeddableInput>({
          explicitInput: { firstName: 'Sam', id: '123' },
          type: CONTACT_CARD_EMBEDDABLE,
        }),
      },
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
  const sampleInput = getSampleDashboardInput();
  const container = new DashboardContainer(
    sampleInput,
    mockedReduxEmbeddablePackage,
    searchSessionId1,
    0,
    undefined,
    undefined,
    { lastSavedInput: sampleInput }
  );
  container?.setControlGroupApi(mockControlGroupApi);
  const embeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Bob',
  });

  expect(embeddable.getInput().searchSessionId).toBe(searchSessionId1);
});

describe('getInheritedInput', () => {
  const dashboardTimeRange = {
    to: 'now',
    from: 'now-15m',
  };
  const dashboardTimeslice = [1688061910000, 1688062209000] as [number, number];

  test('Should pass dashboard timeRange and timeslice to panel when panel does not have custom time range', async () => {
    const container = buildMockDashboard();
    container.updateInput({
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
    const container = buildMockDashboard();
    container.updateInput({
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

  test('Should pass dashboard settings to inherited input', async () => {
    const container = buildMockDashboard({});
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
    expect(embeddableInput.syncTooltips).toBe(false);
    expect(embeddableInput.syncColors).toBe(false);
    expect(embeddableInput.syncCursor).toBe(true);
  });
});
