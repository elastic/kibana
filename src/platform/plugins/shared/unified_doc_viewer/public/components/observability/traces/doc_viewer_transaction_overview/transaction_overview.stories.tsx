/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import type { Meta, StoryObj } from '@storybook/react';
import produce from 'immer';
import { mockUnifiedDocViewerServices } from '../../../../__mocks__';
import { setUnifiedDocViewerServices } from '../../../../plugin';
import httpServerOtelFixture from './__fixtures__/http_server_otel.json';
import { TransactionOverview } from './transaction_overview';

const meta: Meta<typeof TransactionOverview> = {
  title: 'Transaction overview',
  component: TransactionOverview,
} satisfies Meta<typeof TransactionOverview>;

export default meta;
type Story = StoryObj<typeof TransactionOverview>;

// Override items provided by the mock unified doc view services.
const unifiedDocViewerServices = produce(mockUnifiedDocViewerServices, (draft) => {
  // Mock locator return so the locator service returns as expected.
  // This is needed for the links to APM.
  draft.share.url.locators.get = jest
    .fn()
    .mockReturnValue({ getRedirectUrl: jest.fn().mockReturnValue('#') });
  // Turn on APM permissions so links to APM show up
  draft.core.application.capabilities.apm = { show: false };
  // Mock for latency distribution chart
  draft.core.http.post = jest.fn().mockImplementation((url, options) => {
    if (url === '/internal/apm/latency/overall_distribution/transactions') {
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

// The data view mock provided by discover-utils adds the methods like `getByName` to the fields array, but Storybook does not seem to see them, perhaps because of some limitations on object extension.
//
// The components will not render if the `getByName` method is not present, so add it here.
const mockDataView = {
  ...dataViewMockWithTimeField,
  fields: { getByName: () => null },
} as never;

export const OtelHttpServer: Story = {
  name: 'Otel HTTP server transaction',
  args: {
    indexes: {
      apm: {
        traces: 'traces-*',
        errors: 'errors-*',
      },
      logs: 'logs-*',
    },
    dataView: mockDataView,
    hit: buildDataTableRecord(httpServerOtelFixture),
  },
};
