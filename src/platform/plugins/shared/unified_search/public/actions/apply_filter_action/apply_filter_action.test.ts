/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toMountPoint } from '@kbn/react-kibana-mount';
import type { Filter } from '@kbn/es-query';
import type { DataSourceService } from '@kbn/data-source';
import { createFilterAction } from './apply_filter_action';
import type { ApplyFiltersPopoverContent } from './apply_filter_popover_content';

jest.mock('@kbn/react-kibana-mount');

describe('createFilterAction', () => {
  const filterManager = { getFilters: jest.fn(() => []), addFilters: jest.fn() } as any;
  const timeFilter = { setTime: jest.fn() } as any;
  const closeMock = jest.fn();
  const coreStart = {
    overlays: {
      openModal: jest.fn(() => ({ close: closeMock })),
    },
  } as any;

  const filterA: Filter = { meta: { index: 'index-a' } };
  const filterB: Filter = { meta: { index: 'esql-missing' } };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves each filter index through dataSources.get and drops unresolved ones', async () => {
    const dataSourceForA = { id: 'index-a', title: 'a' };
    const dataSources = {
      get: jest.fn((id: string) => Promise.resolve(id === 'index-a' ? dataSourceForA : undefined)),
    } as unknown as DataSourceService;

    const action = createFilterAction(filterManager, timeFilter, coreStart, dataSources);
    void action.execute({ filters: [filterA, filterB] });

    // let the async resolution chain (isCompatible -> Promise.all(dataSources.get) -> openModal) flush
    await new Promise((resolve) => setImmediate(resolve));

    expect(dataSources.get).toHaveBeenCalledWith('index-a');
    expect(dataSources.get).toHaveBeenCalledWith('esql-missing');

    const element = (toMountPoint as jest.Mock).mock.calls[0][0] as React.ReactElement<
      React.ComponentProps<typeof ApplyFiltersPopoverContent>
    >;
    expect(element.props.indexPatterns).toEqual([dataSourceForA]);
  });
});
