/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import type { ArgTypes, Args, Decorator } from '@storybook/react';
import { produce } from 'immer';
import { mockUnifiedDocViewerServices } from '../public/__mocks__';
import { setUnifiedDocViewerServices } from '../public/plugin';

export type UnifiedDocViewerStorybookArgs<T> = Omit<T, 'hit'> & {
  hasApmShowCapability: boolean;
  hit: unknown;
};

// The data view mock provided by discover-utils adds the methods like `getByName` to the fields array, but Storybook does not seem to see them, perhaps because of some limitations on object extension.
//
// The components will not render if some of these methods are not present, so add them here.
const mockDataView = {
  ...dataViewMockWithTimeField,
  fields: {
    getAll: jest.fn().mockReturnValue([]),
    getByName: jest.fn().mockReturnValue(jest.fn()),
  },
} as never;

// Default args for all doc viewer stories.
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

// Allow toggling APM 'show' capability and disable controls for dataView and indexes.
export const argTypes: ArgTypes = {
  hasApmShowCapability: {
    control: 'boolean',
    name: "APM 'show' capability",
  },
  dataView: { control: false },
  indexes: { control: false },
};

export const decorators: Decorator[] = [
  (Story, { args: storyArgs }) => {
    // Override items provided by the mock unified doc view services.
    const unifiedDocViewerServices = produce(mockUnifiedDocViewerServices, (draft) => {
      // Mock locator return so the locator service returns as expected.
      // This is needed for the links to APM.
      draft.share.url.locators.get = jest
        .fn()
        .mockReturnValue({ getRedirectUrl: jest.fn().mockReturnValue('#') });

      draft.core.application.capabilities.apm = {
        show: storyArgs.hasApmShowCapability as boolean,
      };

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

    // The document the doc viewer gets is a `DataTableRecord`, while our fixtures use a "raw" hit object.
    // `buildDataTableRecord` adds the `flattened` fields.
    const hit = buildDataTableRecord(storyArgs.hit as EsHitRecord);
    return Story({ args: { ...storyArgs, hit } });
  },
];
