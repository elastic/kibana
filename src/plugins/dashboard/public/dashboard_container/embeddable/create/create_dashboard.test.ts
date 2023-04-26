/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ContactCardEmbeddable,
  ContactCardEmbeddableFactory,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  CONTACT_CARD_EMBEDDABLE,
} from '@kbn/embeddable-plugin/public/lib/test_samples';
import {
  ControlGroupInput,
  ControlGroupContainer,
  ControlGroupContainerFactory,
} from '@kbn/controls-plugin/public';
import { Filter } from '@kbn/es-query';
import { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';

import { createDashboard } from './create_dashboard';
import { getSampleDashboardPanel } from '../../../mocks';
import { pluginServices } from '../../../services/plugin_services';
import { DashboardCreationOptions } from '../dashboard_container_factory';
import { Observable } from 'rxjs';

const embeddableId = 'create-dat-dashboard';

test('throws error when no data views are available', async () => {
  pluginServices.getServices().data.dataViews.getDefaultDataView = jest
    .fn()
    .mockReturnValue(undefined);
  await expect(async () => {
    await createDashboard(embeddableId);
  }).rejects.toThrow('Dashboard requires at least one data view before it can be initialized.');

  // reset get default data view
  pluginServices.getServices().data.dataViews.getDefaultDataView = jest.fn().mockResolvedValue({});
});

test('throws error when provided validation function returns invalid', async () => {
  const creationOptions: DashboardCreationOptions = {
    validateLoadedSavedObject: jest.fn().mockImplementation(() => false),
  };
  await expect(async () => {
    await createDashboard(embeddableId, creationOptions, 0, 'test-id');
  }).rejects.toThrow('Dashboard failed saved object result validation');
});

test('pulls state from dashboard saved object when given a saved object id', async () => {
  pluginServices.getServices().dashboardSavedObject.loadDashboardStateFromSavedObject = jest
    .fn()
    .mockResolvedValue({ dashboardInput: { description: 'wow would you look at that? Wow.' } });
  const dashboard = await createDashboard(embeddableId, {}, 0, 'wow-such-id');
  expect(
    pluginServices.getServices().dashboardSavedObject.loadDashboardStateFromSavedObject
  ).toHaveBeenCalledWith({ id: 'wow-such-id' });
  expect(dashboard.getState().explicitInput.description).toBe('wow would you look at that? Wow.');
});

test('pulls state from session storage which overrides state from saved object', async () => {
  pluginServices.getServices().dashboardSavedObject.loadDashboardStateFromSavedObject = jest
    .fn()
    .mockResolvedValue({ dashboardInput: { description: 'wow this description is okay' } });
  pluginServices.getServices().dashboardSessionStorage.getState = jest
    .fn()
    .mockReturnValue({ description: 'wow this description marginally better' });
  const dashboard = await createDashboard(
    embeddableId,
    { useSessionStorageIntegration: true },
    0,
    'wow-such-id'
  );
  expect(dashboard.getState().explicitInput.description).toBe(
    'wow this description marginally better'
  );
});

test('pulls state from creation options initial input which overrides all other state sources', async () => {
  pluginServices.getServices().dashboardSavedObject.loadDashboardStateFromSavedObject = jest
    .fn()
    .mockResolvedValue({ dashboardInput: { description: 'wow this description is okay' } });
  pluginServices.getServices().dashboardSessionStorage.getState = jest
    .fn()
    .mockReturnValue({ description: 'wow this description marginally better' });
  const dashboard = await createDashboard(
    embeddableId,
    {
      useSessionStorageIntegration: true,
      initialInput: { description: 'wow this description is a masterpiece' },
    },
    0,
    'wow-such-id'
  );
  expect(dashboard.getState().explicitInput.description).toBe(
    'wow this description is a masterpiece'
  );
});

test('applies filters and query from state to query service', async () => {
  const filters: Filter[] = [
    { meta: { alias: 'test', disabled: false, negate: false, index: 'test' } },
  ];
  const query = { language: 'kql', query: 'query' };
  await createDashboard(embeddableId, {
    useUnifiedSearchIntegration: true,
    unifiedSearchSettings: {
      kbnUrlStateStorage: createKbnUrlStateStorage(),
    },
    initialInput: { filters, query },
  });
  expect(pluginServices.getServices().data.query.queryString.setQuery).toHaveBeenCalledWith(query);
  expect(pluginServices.getServices().data.query.filterManager.setAppFilters).toHaveBeenCalledWith(
    filters
  );
});

test('applies time range and refresh interval from initial input to query service if time restore is on', async () => {
  const timeRange = { from: new Date().toISOString(), to: new Date().toISOString() };
  const refreshInterval = { pause: false, value: 42 };
  await createDashboard(embeddableId, {
    useUnifiedSearchIntegration: true,
    unifiedSearchSettings: {
      kbnUrlStateStorage: createKbnUrlStateStorage(),
    },
    initialInput: { timeRange, refreshInterval, timeRestore: true },
  });
  expect(
    pluginServices.getServices().data.query.timefilter.timefilter.setTime
  ).toHaveBeenCalledWith(timeRange);
  expect(
    pluginServices.getServices().data.query.timefilter.timefilter.setRefreshInterval
  ).toHaveBeenCalledWith(refreshInterval);
});

test('applied time range from query service to initial input if time restore is off', async () => {
  const timeRange = { from: new Date().toISOString(), to: new Date().toISOString() };
  pluginServices.getServices().data.query.timefilter.timefilter.getTime = jest
    .fn()
    .mockReturnValue(timeRange);
  const dashboard = await createDashboard(embeddableId, {
    useUnifiedSearchIntegration: true,
    unifiedSearchSettings: {
      kbnUrlStateStorage: createKbnUrlStateStorage(),
    },
  });
  expect(dashboard.getState().explicitInput.timeRange).toEqual(timeRange);
});

test('replaces panel with incoming embeddable if id matches existing panel', async () => {
  const incomingEmbeddable: EmbeddablePackageState = {
    type: CONTACT_CARD_EMBEDDABLE,
    input: {
      id: 'i_match',
      firstName: 'wow look at this replacement wow',
    } as ContactCardEmbeddableInput,
    embeddableId: 'i_match',
  };
  const dashboard = await createDashboard(embeddableId, {
    incomingEmbeddable,
    initialInput: {
      panels: {
        i_match: getSampleDashboardPanel<ContactCardEmbeddableInput>({
          explicitInput: {
            id: 'i_match',
            firstName: 'oh no, I am about to get replaced',
          },
          type: CONTACT_CARD_EMBEDDABLE,
        }),
      },
    },
  });
  expect(dashboard.getState().explicitInput.panels.i_match.explicitInput).toStrictEqual(
    expect.objectContaining({
      id: 'i_match',
      firstName: 'wow look at this replacement wow',
    })
  );
});

test('creates new embeddable with incoming embeddable if id does not match existing panel', async () => {
  const incomingEmbeddable: EmbeddablePackageState = {
    type: CONTACT_CARD_EMBEDDABLE,
    input: {
      id: 'i_match',
      firstName: 'wow look at this new panel wow',
    } as ContactCardEmbeddableInput,
    embeddableId: 'i_match',
  };
  const mockContactCardFactory = {
    create: jest.fn().mockReturnValue({ destroy: jest.fn() }),
    getDefaultInput: jest.fn().mockResolvedValue({}),
  };
  pluginServices.getServices().embeddable.getEmbeddableFactory = jest
    .fn()
    .mockReturnValue(mockContactCardFactory);

  await createDashboard(embeddableId, {
    incomingEmbeddable,
    initialInput: {
      panels: {
        i_do_not_match: getSampleDashboardPanel<ContactCardEmbeddableInput>({
          explicitInput: {
            id: 'i_do_not_match',
            firstName: 'phew... I will not be replaced',
          },
          type: CONTACT_CARD_EMBEDDABLE,
        }),
      },
    },
  });
  // flush promises
  await new Promise((r) => setTimeout(r, 1));
  expect(mockContactCardFactory.create).toHaveBeenCalledWith(
    expect.objectContaining({
      id: 'i_match',
      firstName: 'wow look at this new panel wow',
    }),
    expect.any(Object)
  );
});

test('creates a control group from the control group factory and waits for it to be initialized', async () => {
  const mockControlGroupContainer = {
    destroy: jest.fn(),
    render: jest.fn(),
    updateInput: jest.fn(),
    untilInitialized: jest.fn(),
    getInput: jest.fn().mockReturnValue({}),
    getInput$: jest.fn().mockReturnValue(new Observable()),
    getOutput$: jest.fn().mockReturnValue(new Observable()),
  } as unknown as ControlGroupContainer;
  const mockControlGroupFactory = {
    create: jest.fn().mockReturnValue(mockControlGroupContainer),
  } as unknown as ControlGroupContainerFactory;
  pluginServices.getServices().embeddable.getEmbeddableFactory = jest
    .fn()
    .mockReturnValue(mockControlGroupFactory);
  await createDashboard(embeddableId, {
    useControlGroupIntegration: true,
    initialInput: {
      controlGroupInput: { controlStyle: 'twoLine' } as unknown as ControlGroupInput,
    },
  });
  // flush promises
  await new Promise((r) => setTimeout(r, 1));
  expect(pluginServices.getServices().embeddable.getEmbeddableFactory).toHaveBeenCalledWith(
    'control_group'
  );
  expect(mockControlGroupFactory.create).toHaveBeenCalledWith(
    expect.objectContaining({ controlStyle: 'twoLine' })
  );
  expect(mockControlGroupContainer.untilInitialized).toHaveBeenCalled();
});

/*
 * dashboard.getInput$() subscriptions are used to update:
 * 1) dashboard instance searchSessionId state
 * 2) child input on parent input changes
 *
 * Rxjs subscriptions are executed in the order that they are created.
 * This test ensures that searchSessionId update subscription is created before child input subscription
 * to ensure child input subscription includes updated searchSessionId.
 */
test('searchSessionId is updated prior to child embeddable parent subscription execution', async () => {
  const embeddableFactory = {
    create: new ContactCardEmbeddableFactory((() => null) as any, {} as any),
    getDefaultInput: jest.fn().mockResolvedValue({
      timeRange: {
        to: 'now',
        from: 'now-15m',
      },
    }),
  };
  pluginServices.getServices().embeddable.getEmbeddableFactory = jest
    .fn()
    .mockReturnValue(embeddableFactory);
  let sessionCount = 0;
  pluginServices.getServices().data.search.session.start = () => {
    sessionCount++;
    return `searchSessionId${sessionCount}`;
  };
  const dashboard = await createDashboard(embeddableId, {
    searchSessionSettings: {
      getSearchSessionIdFromURL: () => undefined,
      removeSessionIdFromUrl: () => {},
      createSessionRestorationDataProvider: () => {},
    } as unknown as DashboardCreationOptions['searchSessionSettings'],
  });
  const embeddable = await dashboard.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Bob',
  });

  expect(embeddable.getInput().searchSessionId).toBe('searchSessionId1');

  dashboard.updateInput({
    timeRange: {
      to: 'now',
      from: 'now-7d',
    },
  });

  expect(sessionCount).toBeGreaterThan(1);
  const embeddableInput = embeddable.getInput();
  expect((embeddableInput as any).timeRange).toEqual({
    to: 'now',
    from: 'now-7d',
  });
  expect(embeddableInput.searchSessionId).toBe(`searchSessionId${sessionCount}`);
});
