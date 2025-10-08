/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { waitFor, renderHook } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core/public/mocks';

import { fieldsMetadataPluginPublicMock } from '@kbn/fields-metadata-plugin/public/mocks';
import { useLoadRuleTypeAlertFields } from './use_load_rule_type_alert_fields';

const queryClient = new QueryClient();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const http = httpServiceMock.createStartContract();
const fieldsMetadataMock = fieldsMetadataPluginPublicMock.createStartContract();

describe('useLoadRuleTypeAlertFields', () => {
  beforeEach(() => {
    http.get.mockResolvedValue({
      fields: [
        {
          name: '@timestamp',
          deprecated: false,
          useWithTripleBracesInTemplates: false,
          usesPublicBaseUrl: false,
        },
      ],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should call API endpoint with the correct parameters', async () => {
    const { result } = renderHook(
      () =>
        useLoadRuleTypeAlertFields({
          http,
          fieldsMetadata: fieldsMetadataMock,
          ruleTypeId: 'ruleTypeId',
          enabled: true,
        }),
      { wrapper }
    );

    await waitFor(() => {
      return expect(result.current.isInitialLoading).toEqual(false);
    });

    expect(http.get).toHaveBeenLastCalledWith('/internal/rac/alerts/browser_fields', {
      query: { ruleTypeIds: ['ruleTypeId'] },
    });
  });
});
