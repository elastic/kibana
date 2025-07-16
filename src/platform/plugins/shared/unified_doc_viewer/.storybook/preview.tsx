/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataTableRecord } from '@kbn/discover-utils';
import { dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import type { ArgTypes, Args, Decorator } from '@storybook/react';
import { produce } from 'immer';
import React from 'react';
import { mockUnifiedDocViewerServices } from '../public/__mocks__';
import { setUnifiedDocViewerServices } from '../public/plugin';

// The data view mock provided by discover-utils adds the methods like `getByName` to the fields array, but Storybook does not seem to see them, perhaps because of some limitations on object extension.
//
// The components will not render if some of these methods are not present, so add them here.
const mockDataView = {
  ...dataViewMockWithTimeField,
  fields: { getAll: jest.fn().mockReturnValue([]), getByName: () => jest.fn() },
} as never;

export type UnifiedDocViewerStorybookArgs<T> = T & {
  hit: DataTableRecord;
  hasApmShowCapability: boolean;
};

export const args: Args = {
  dataView: mockDataView,
  hasApmShowCapability: true,
  indexes: {
    apm: {
      traces: 'traces-*',
      errors: 'errors-*',
    },
    logs: 'logs-*',
  },
};

export const argTypes: ArgTypes = {
  hasApmShowCapability: { control: 'boolean', name: "APM 'show' capability" },
};

export const decorators: Decorator[] = [
  (Story, { args: { hasApmShowCapability } }) => {
    // Override items provided by the mock unified doc view services.
    const unifiedDocViewerServices = produce(mockUnifiedDocViewerServices, (draft) => {
      // Mock locator return so the locator service returns as expected.
      // This is needed for the links to APM.
      draft.share.url.locators.get = jest
        .fn()
        .mockReturnValue({ getRedirectUrl: jest.fn().mockReturnValue('#') });

      draft.core.application.capabilities.apm = { show: hasApmShowCapability as boolean };

      // Mock for latency distribution chart
      draft.core.http.post = jest.fn().mockImplementation((url, options) => {
        if (url.startsWith('/internal/apm/latency/overall_distribution/')) {
          return {
            percentileThresholdValue: 1,
            durationMin: 1,
            durationMax: 1,
            totalDocCount: 1,
            overallHistogram: [
              {
                key: 1,
                doc_count: 1,
              },
            ],
          };
        } else {
          return draft.core.http.post(url, options);
        }
      });
    });

    setUnifiedDocViewerServices(unifiedDocViewerServices);

    return <Story />;
  },
];
