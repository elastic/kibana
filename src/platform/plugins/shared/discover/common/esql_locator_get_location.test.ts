/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getESQLAdHocDataview, getIndexForESQLQuery, getInitialESQLQuery } from '@kbn/esql-utils';
import { esqlLocatorGetLocation } from './esql_locator_get_location';

jest.mock('@kbn/esql-utils', () => ({
  getESQLAdHocDataview: jest.fn(),
  getIndexForESQLQuery: jest.fn(),
  getInitialESQLQuery: jest.fn(),
}));

describe('esqlLocatorGetLocation', () => {
  it('creates the ES|QL ad hoc DataView without fetching field caps', async () => {
    const dataView = { id: 'esql-mock' };
    (getIndexForESQLQuery as jest.Mock).mockResolvedValue('logs-*');
    (getESQLAdHocDataview as jest.Mock).mockResolvedValue(dataView);
    (getInitialESQLQuery as jest.Mock).mockReturnValue('FROM logs-*');

    const discoverAppLocator = {
      getLocation: jest.fn().mockResolvedValue({ app: 'discover', path: '/', state: {} }),
    };
    const dataViews = {} as never;
    const http = {} as never;

    await esqlLocatorGetLocation({
      discoverAppLocator: discoverAppLocator as never,
      dataViews,
      http,
    });

    expect(getESQLAdHocDataview).toHaveBeenCalledWith({
      dataViewsService: dataViews,
      query: 'FROM logs-*',
      http,
      options: { skipFetchFields: true },
    });
    expect(discoverAppLocator.getLocation).toHaveBeenCalledWith({
      query: { esql: 'FROM logs-*' },
    });
  });
});
