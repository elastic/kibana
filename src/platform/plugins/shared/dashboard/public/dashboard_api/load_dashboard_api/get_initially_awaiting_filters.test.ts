/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { embeddableService } from '../../services/kibana_services';
import { getInitiallyAwaitingFilters } from './get_initially_awaiting_filters';

jest.mock('../../services/kibana_services', () => ({
  embeddableService: { getEmbeddableDefinition: jest.fn() },
}));

const getEmbeddableDefinition = embeddableService.getEmbeddableDefinition as jest.Mock;

const pinned = (type: string, config: object = {}) =>
  ({ type, config } as unknown as NonNullable<DashboardState['pinned_panels']>[number]);

describe('getInitiallyAwaitingFilters', () => {
  beforeEach(() => {
    getEmbeddableDefinition.mockReset();
  });

  test('is false without pinned panels', async () => {
    expect(await getInitiallyAwaitingFilters([])).toBe(false);
  });

  test('is true when any pinned panel definition reports awaiting filters', async () => {
    getEmbeddableDefinition.mockImplementation(async (type: string) => ({
      isAwaitingFilters: () => type === 'required_control',
    }));
    expect(
      await getInitiallyAwaitingFilters([pinned('plain_control'), pinned('required_control')])
    ).toBe(true);
  });

  test('passes the panel config to the definition', async () => {
    const isAwaitingFilters = jest.fn().mockResolvedValue(false);
    getEmbeddableDefinition.mockResolvedValue({ isAwaitingFilters });
    await getInitiallyAwaitingFilters([pinned('control', { required: true })]);
    expect(isAwaitingFilters).toHaveBeenCalledWith({ required: true });
  });

  test('is false when the definition is missing, has no member, or throws', async () => {
    getEmbeddableDefinition
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('failed to load'));
    expect(await getInitiallyAwaitingFilters([pinned('a'), pinned('b'), pinned('c')])).toBe(false);
  });
});
