/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { buildDataTableRecord, type DataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { FeaturesRegistry } from '@kbn/discover-shared-plugin/common';
import type { DiscoverFeature } from '@kbn/discover-shared-plugin/public';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { discoverServiceMock } from '../../../__mocks__/services';
import {
  EMPTY_CONTEXT_AWARENESS_TOOLKIT,
  type ContextAwarenessToolkit,
} from '../../../context_awareness';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import { getEntitySummaryCell } from './create_entity_cell_renderers';
import { createServiceSummaryDefinition } from './definitions/service_summary_definition';

jest.mock('../../../hooks/use_discover_services');

const SERVICE_SUMMARY_FEATURE_ID = 'observability-traces-fetch-service-summary';

const toolkit: ContextAwarenessToolkit = {
  ...EMPTY_CONTEXT_AWARENESS_TOOLKIT,
  actions: { ...EMPTY_CONTEXT_AWARENESS_TOOLKIT.actions, addFilter: jest.fn() },
};

const FallbackCell = () => <div data-test-subj="fallbackCell">fallback</div>;

const serviceRow = buildDataTableRecord(
  { fields: { 'service.name': 'checkoutService', 'agent.name': 'nodejs' } },
  dataViewMock
);

const cellProps = (row: DataTableRecord): DataGridCellValueElementProps => ({
  rowIndex: 0,
  colIndex: 0,
  columnId: 'service.name',
  isExpandable: false,
  isExpanded: false,
  isDetails: false,
  row,
  dataView: dataViewMock,
  fieldFormats: fieldFormatsMock,
  setCellProps: () => {},
  closePopover: () => {},
});

const renderServiceCell = ({
  feature,
  row,
}: {
  feature?: DiscoverFeature;
  row: DataTableRecord;
}) => {
  const registry = new FeaturesRegistry<DiscoverFeature>();
  if (feature) {
    registry.register(feature);
  }
  jest.mocked(useDiscoverServices).mockReturnValue({
    ...discoverServiceMock,
    discoverShared: { features: { registry } },
  });

  const Cell = getEntitySummaryCell({
    fieldName: 'service.name',
    definition: createServiceSummaryDefinition(),
    toolkit,
    FallbackCell,
  });
  render(<Cell {...cellProps(row)} />);
};

describe('getEntitySummaryCell', () => {
  it('renders the entity summary chip when the backing data feature is available', () => {
    renderServiceCell({
      feature: { id: SERVICE_SUMMARY_FEATURE_ID, fetchServiceSummary: jest.fn() },
      row: serviceRow,
    });

    expect(screen.getByTestId('entitySummaryCell-badge')).toBeVisible();
    expect(screen.queryByTestId('fallbackCell')).not.toBeInTheDocument();
  });

  it('falls back to the provided cell when the backing data feature is unavailable', () => {
    renderServiceCell({ row: serviceRow });

    expect(screen.getByTestId('fallbackCell')).toBeVisible();
    expect(screen.queryByTestId('entitySummaryCell-badge')).not.toBeInTheDocument();
  });
});
