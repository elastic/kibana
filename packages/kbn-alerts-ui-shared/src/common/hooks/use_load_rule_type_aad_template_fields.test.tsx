/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-hooks/dom';
import { waitFor } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core/public/mocks';

import { useLoadRuleTypeAadTemplateField } from './use_load_rule_type_aad_template_fields';

const queryClient = new QueryClient();

const wrapper = ({ children }: { children: Node }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const http = httpServiceMock.createStartContract();

describe('useLoadRuleTypeAadTemplateFields', () => {
  beforeEach(() => {
    http.get.mockResolvedValue([
      {
        name: 'aadTemplate',
        description: 'description',
        deprecated: false,
        useWithTripleBracesInTemplates: false,
        usesPublicBaseUrl: false,
      },
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should call API endpoint with the correct parameters', async () => {
    const { result } = renderHook(
      () =>
        useLoadRuleTypeAadTemplateField({
          http,
          ruleTypeId: 'ruleTypeId',
          enabled: true,
        }),
      { wrapper }
    );

    await waitFor(() => {
      return expect(result.current.isInitialLoading).toEqual(false);
    });

    expect(result.current.data).toEqual([
      {
        description: '',
        name: 'aadTemplate',
      },
    ]);
  });
});
