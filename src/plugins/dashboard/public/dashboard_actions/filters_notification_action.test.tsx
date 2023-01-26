/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ErrorEmbeddable, isErrorEmbeddable, ViewMode } from '@kbn/embeddable-plugin/public';
import {
  ContactCardEmbeddable,
  CONTACT_CARD_EMBEDDABLE,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  ContactCardEmbeddableFactory,
} from '@kbn/embeddable-plugin/public/lib/test_samples/embeddables';
import { type Query, type AggregateQuery, Filter } from '@kbn/es-query';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';

import { getSampleDashboardInput } from '../mocks';
import { pluginServices } from '../services/plugin_services';
import { DashboardContainer } from '../dashboard_container/embeddable/dashboard_container';
import { FiltersNotificationAction } from './filters_notification_action';

const mockEmbeddableFactory = new ContactCardEmbeddableFactory((() => null) as any, {} as any);
pluginServices.getServices().embeddable.getEmbeddableFactory = jest
  .fn()
  .mockReturnValue(mockEmbeddableFactory);

const mockGetFilters = jest.fn(async () => [] as Filter[]);
const mockGetQuery = jest.fn(async () => undefined as Query | AggregateQuery | undefined);

const getMockPhraseFilter = (key: string, value: string) => {
  return {
    meta: {
      type: 'phrase',
      key,
      params: {
        query: value,
      },
    },
    query: {
      match_phrase: {
        [key]: value,
      },
    },
    $state: {
      store: 'appState',
    },
  };
};

const buildEmbeddable = async (input?: Partial<ContactCardEmbeddableInput>) => {
  const container = new DashboardContainer(getSampleDashboardInput());
  await container.untilInitialized();
  const contactCardEmbeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Kibanana',
    viewMode: ViewMode.EDIT,
    ...input,
  });
  if (isErrorEmbeddable(contactCardEmbeddable)) {
    throw new Error('Failed to create embeddable');
  }

  const embeddable = embeddablePluginMock.mockFilterableEmbeddable(contactCardEmbeddable, {
    getFilters: () => mockGetFilters(),
    getQuery: () => mockGetQuery(),
  });

  return embeddable;
};

const action = new FiltersNotificationAction();

test('Badge is incompatible with Error Embeddables', async () => {
  const errorEmbeddable = new ErrorEmbeddable('Wow what an awful error', { id: ' 404' });
  expect(await action.isCompatible({ embeddable: errorEmbeddable })).toBe(false);
});

test('Badge is not shown when panel has no app-level filters or queries', async () => {
  const embeddable = await buildEmbeddable();
  expect(await action.isCompatible({ embeddable })).toBe(false);
});

test('Badge is shown when panel has at least one app-level filter', async () => {
  const embeddable = await buildEmbeddable();
  mockGetFilters.mockResolvedValue([getMockPhraseFilter('fieldName', 'someValue')] as Filter[]);
  expect(await action.isCompatible({ embeddable })).toBe(true);
});

test('Badge is shown when panel has at least one app-level query', async () => {
  const embeddable = await buildEmbeddable();
  mockGetQuery.mockResolvedValue({ sql: 'SELECT * FROM test_dataview' } as AggregateQuery);
  expect(await action.isCompatible({ embeddable })).toBe(true);
});

test('Badge is not shown in view mode', async () => {
  const embeddable = await buildEmbeddable({ viewMode: ViewMode.VIEW });
  expect(await action.isCompatible({ embeddable })).toBe(false);
});
