/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import React from 'react';
import { buildDataViewMock, generateEsHits } from '@kbn/discover-utils/src/__mocks__';
import { createDiscoverServicesMock } from '../../__mocks__/services';
import { type DataTableRecord, buildDataTableRecord } from '@kbn/discover-utils';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { useRowIndicatorProvider } from './use_row_indicator_provider';
import { useEuiTheme } from '@elastic/eui';
import type { DiscoverServices } from '../../build_services';
import type { DataView } from '@kbn/data-views-plugin/common';

const renderHookWrapper = async ({
  services,
  params,
}: {
  services: DiscoverServices;
  params?: { dataView: DataView; record: DataTableRecord };
}) => {
  const dataView = params?.dataView ?? buildDataViewMock({});
  const record = params?.record ?? buildDataTableRecord(generateEsHits(dataView, 1)[0], dataView);
  const hook = renderHook(
    () => {
      const { euiTheme } = useEuiTheme();
      const getRowIndicator = useRowIndicatorProvider({ dataView });
      return getRowIndicator(record, euiTheme);
    },
    {
      wrapper: ({ children }) => (
        <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
      ),
    }
  );
  return { hook };
};

describe('useRowIndicatorProvider', () => {
  it('should return undefined when no profile is found', async () => {
    const services = createDiscoverServicesMock();
    const { hook } = await renderHookWrapper({ services });
    expect(hook.result.current).toBeUndefined();
  });

  it('should return root profile indicator', async () => {
    const services = createDiscoverServicesMock();
    await services.profilesManager.resolveRootProfile({});
    const { hook } = await renderHookWrapper({ services });
    expect(hook.result.current).toEqual({ label: 'root-indicator', color: 'red' });
  });

  it('should return data source profile indicator', async () => {
    const services = createDiscoverServicesMock();
    await services.profilesManager.resolveRootProfile({});
    await services.profilesManager.resolveDataSourceProfile({});
    const { hook } = await renderHookWrapper({ services });
    expect(hook.result.current).toEqual({ label: 'data-source-indicator', color: 'blue' });
  });

  it('should return document profile indicator', async () => {
    const services = createDiscoverServicesMock();
    await services.profilesManager.resolveRootProfile({});
    await services.profilesManager.resolveDataSourceProfile({});
    const dataView = buildDataViewMock({});
    const hit = generateEsHits(dataView, 1)[0];
    const record = services.profilesManager.resolveDocumentProfile({
      record: buildDataTableRecord(hit, dataView),
    });
    const { hook } = await renderHookWrapper({ services, params: { dataView, record } });
    expect(hook.result.current).toEqual({ label: 'document-indicator', color: 'green' });
  });
});
