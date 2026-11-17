/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CustomGridColumnsConfiguration } from '@kbn/unified-data-table';
import { createEsqlDataSource } from '../../../../../common/data_sources';
import { createProfileProviderSharedServicesMock } from '../../../__mocks__';
import { SolutionType } from '../../../profiles';
import { EMPTY_CONTEXT_AWARENESS_TOOLKIT } from '../../../toolkit';
import { createPatternsDataSourceProfileProvider } from './profile';

const query =
  'FROM logs | STATS count = COUNT(*), trend = SPARKLINE(COUNT(*), @timestamp), average = AVG(bytes) BY Pattern = CATEGORIZE(message)';

const getConfiguration = async (
  esql = query,
  previous: CustomGridColumnsConfiguration = {}
): Promise<CustomGridColumnsConfiguration> => {
  const provider = createPatternsDataSourceProfileProvider({
    ...createProfileProviderSharedServicesMock(),
    aiops: undefined,
  });
  const resolution = await provider.resolve({
    rootContext: { profileId: 'default-root-profile', solutionType: SolutionType.Default },
    dataSource: createEsqlDataSource(),
    query: { esql },
  });
  if (!resolution.isMatch || !provider.profile.getColumnsConfiguration) {
    throw new Error('Expected the Patterns profile column configuration');
  }
  return provider.profile.getColumnsConfiguration(() => previous, {
    context: resolution.context,
    toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
  })();
};

describe('Patterns profile column widths', () => {
  it('sizes count and sparkline aliases without configuring other result columns', async () => {
    const configuration = await getConfiguration();
    expect(Object.keys(configuration)).toEqual(['count', 'trend']);
    for (const name of ['count', 'trend']) {
      expect(configuration[name]({ column: { id: name } })).toEqual({
        id: name,
        initialWidth: 150,
      });
    }
  });

  it('follows renamed metric aliases', async () => {
    const configuration = await getConfiguration(
      query + ' | RENAME count AS total, trend AS spark'
    );
    expect(Object.keys(configuration)).toEqual(['total', 'spark']);
    expect(configuration.total({ column: { id: 'total' } }).initialWidth).toBe(150);
  });

  it('preserves saved and manually resized widths', async () => {
    const configuration = await getConfiguration();
    const column = { id: 'count', initialWidth: 280 };
    expect(configuration.count({ column, columnSettings: { width: 280 } })).toBe(column);
  });

  it('preserves an explicit reset to automatic width', async () => {
    const configuration = await getConfiguration();
    const column = { id: 'count' };
    expect(configuration.count({ column, columnSettings: {} })).toBe(column);
  });

  it('preserves prior column customizations and widths', async () => {
    const previous: CustomGridColumnsConfiguration = {
      count: ({ column }) => ({ ...column, initialWidth: 240, displayAsText: 'Events' }),
      average: ({ column }) => ({ ...column, displayAsText: 'Average bytes' }),
    };
    const configuration = await getConfiguration(query, previous);
    expect(configuration.count({ column: { id: 'count' } })).toEqual({
      id: 'count',
      initialWidth: 240,
      displayAsText: 'Events',
    });
    expect(configuration.average).toBe(previous.average);
  });

  it('adds widths without discarding a previous header customization', async () => {
    const configuration = await getConfiguration(query, {
      count: ({ column }) => ({ ...column, displayAsText: 'Events' }),
    });
    expect(configuration.count({ column: { id: 'count' } })).toEqual({
      id: 'count',
      initialWidth: 150,
      displayAsText: 'Events',
    });
  });

  it('leaves ambiguous transformations at normal widths', async () => {
    expect(await getConfiguration(query + ' | EVAL count = TO_STRING(count)')).toEqual({});
  });
});
