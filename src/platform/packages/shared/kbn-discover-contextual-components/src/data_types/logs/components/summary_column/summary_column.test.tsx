/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { render, screen } from '@testing-library/react';
import SummaryColumn, {
  AllSummaryColumnProps,
  SummaryCellPopover,
  SummaryColumnFactoryDeps,
  SummaryColumnProps,
} from './summary_column';
import { DataGridDensity, ROWS_HEIGHT_OPTIONS } from '@kbn/unified-data-table';
import * as constants from '@kbn/discover-utils/src/data_types/logs/constants';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { coreMock as corePluginMock } from '@kbn/core/public/mocks';
import { DataTableRecord, buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__/data_view';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiCodeBlock: ({
    children,
    dangerouslySetInnerHTML,
  }: {
    children?: string;
    dangerouslySetInnerHTML?: { __html: string };
  }) => <code data-test-subj="codeBlock">{children ?? dangerouslySetInnerHTML?.__html ?? ''}</code>,
}));

const getSummaryProps = (
  record: DataTableRecord,
  opts: Partial<SummaryColumnProps & SummaryColumnFactoryDeps> = {}
): AllSummaryColumnProps => ({
  rowIndex: 0,
  colIndex: 0,
  columnId: '_source',
  isExpandable: true,
  isExpanded: false,
  isDetails: false,
  row: record,
  dataView: dataViewMock,
  fieldFormats: fieldFormatsMock,
  setCellProps: () => {},
  closePopover: () => {},
  density: DataGridDensity.COMPACT,
  rowHeight: 1,
  onFilter: jest.fn(),
  shouldShowFieldHandler: () => true,
  core: corePluginMock.createStart(),
  share: sharePluginMock.createStartContract(),
  isTracesSummary: false,
  ...opts,
});

const renderSummary = (
  record: DataTableRecord,
  opts: Partial<SummaryColumnProps & SummaryColumnFactoryDeps> = {}
) => {
  render(<SummaryColumn {...getSummaryProps(record, opts)} />);
};

const getBaseRecord = (overrides: Record<string, unknown> = {}) =>
  buildDataTableRecord(
    {
      fields: {
        '@timestamp': 1726218404776,
        'agent.name': 'nodejs',
        'cloud.availability_zone': 'area-51a',
        'cloud.instance.id': '3275100000000076',
        'cloud.project.id': '3275100000000075',
        'cloud.provider': 'azure',
        'cloud.region': 'area-51',
        'container.name': 'synth-service-2-3275100000000073',
        'error.log.stacktrace': 'Error message in error.log.stacktrace',
        'event.original': 'Error with certificate: "ca_trusted_fingerprint"',
        'host.name': 'synth-host',
        'orchestrator.cluster.id': '3275100000000002',
        'orchestrator.cluster.name': 'synth-cluster-3',
        'orchestrator.namespace': 'kube',
        'orchestrator.resource.id': '3275100000000074',
        'service.name': 'synth-service-2',
        'trace.id': '3275100000000072',
        message: 'Yet another debug log',
        ...overrides,
      },
    },
    dataViewMock
  );

describe('SummaryColumn', () => {
  describe('when rendering resource badges', () => {
    it('should render a maximum of 3 resource badges in row compact mode', () => {
      const record = getBaseRecord();
      renderSummary(record);
      expect(
        screen.queryByTestId(`dataTableCellActionsPopover_${constants.SERVICE_NAME_FIELD}`)
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(`dataTableCellActionsPopover_${constants.CONTAINER_NAME_FIELD}`)
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(`dataTableCellActionsPopover_${constants.HOST_NAME_FIELD}`)
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(
          `dataTableCellActionsPopover_${constants.ORCHESTRATOR_NAMESPACE_FIELD}`
        )
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId(`dataTableCellActionsPopover_${constants.CLOUD_INSTANCE_ID_FIELD}`)
      ).not.toBeInTheDocument();
    });

    it('should render a badge indicating the count of additional resources', () => {
      const record = getBaseRecord();
      renderSummary(record);
      expect(screen.queryByText('+2')).toBeInTheDocument();
      expect(screen.queryByText('+3')).not.toBeInTheDocument();
    });

    it('should render all the available resources in row autofit/custom mode', () => {
      const record = getBaseRecord();
      renderSummary(record, {
        density: DataGridDensity.COMPACT,
        rowHeight: ROWS_HEIGHT_OPTIONS.auto,
      });
      expect(
        screen.queryByTestId(`dataTableCellActionsPopover_${constants.SERVICE_NAME_FIELD}`)
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(`dataTableCellActionsPopover_${constants.CONTAINER_NAME_FIELD}`)
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(`dataTableCellActionsPopover_${constants.HOST_NAME_FIELD}`)
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(
          `dataTableCellActionsPopover_${constants.ORCHESTRATOR_NAMESPACE_FIELD}`
        )
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(`dataTableCellActionsPopover_${constants.CLOUD_INSTANCE_ID_FIELD}`)
      ).toBeInTheDocument();
      expect(screen.queryByText('+2')).not.toBeInTheDocument();
    });

    it('should display a popover with details and actions upon a badge click', () => {
      const record = getBaseRecord();
      renderSummary(record);
      // Open badge popover
      screen.getByTestId(`dataTableCellActionsPopover_${constants.SERVICE_NAME_FIELD}`).click();

      expect(screen.getByTestId('dataTableCellActionPopoverTitle')).toHaveTextContent(
        'service.name synth-service-2'
      );
      expect(
        screen.getByTestId(`dataTableCellAction_addToFilterAction_${constants.SERVICE_NAME_FIELD}`)
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(
          `dataTableCellAction_removeFromFilterAction_${constants.SERVICE_NAME_FIELD}`
        )
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(
          `dataTableCellAction_copyToClipboardAction_${constants.SERVICE_NAME_FIELD}`
        )
      ).toBeInTheDocument();
    });
  });

  describe('when rendering trace badges', () => {
    it('should display service.name with different fields exposed', () => {
      const record = getBaseRecord({
        'event.outcome': 'success',
        'transaction.name': 'GET /',
        'transaction.duration.us': 100,
        'data_stream.type': 'traces',
      });
      renderSummary(record, {
        density: DataGridDensity.COMPACT,
        rowHeight: ROWS_HEIGHT_OPTIONS.auto,
        isTracesSummary: true,
      });

      expect(
        screen.queryByTestId(`dataTableCellActionsPopover_${constants.SERVICE_NAME_FIELD}`)
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(`dataTableCellActionsPopover_${constants.EVENT_OUTCOME_FIELD}`)
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(`dataTableCellActionsPopover_${constants.TRANSACTION_NAME_FIELD}`)
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(`dataTableCellActionsPopover_${constants.TRANSACTION_DURATION_FIELD}`)
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(`dataTableCellActionsPopover_${constants.CONTAINER_NAME_FIELD}`)
      ).not.toBeInTheDocument();
    });
  });

  describe('when rendering the main content', () => {
    it('should display the message field as first choice', () => {
      const record = getBaseRecord();
      renderSummary(record);
      expect(screen.queryByTestId('discoverDataTableMessageValue')).toHaveTextContent(
        record.flattened.message as string
      );
    });

    it(`should fallback to ${constants.ERROR_MESSAGE_FIELD} and ${constants.EVENT_ORIGINAL_FIELD} fields if message does not exist`, () => {
      const recordWithoutMessage = getBaseRecord({ message: undefined });
      renderSummary(recordWithoutMessage);
      expect(screen.queryByTestId('discoverDataTableMessageValue')).toHaveTextContent(
        recordWithoutMessage.flattened[constants.EVENT_ORIGINAL_FIELD] as string
      );
    });
  });
});

describe('SummaryCellPopover', () => {
  it('should render message value', async () => {
    const message = 'This is a message';
    render(<SummaryCellPopover {...getSummaryProps(getBaseRecord({ message }))} />);
    expect(screen.queryByTestId('codeBlock')?.innerHTML).toBe(message);
  });

  it('should render formatted JSON message value', async () => {
    const json = { foo: { bar: true } };
    const message = JSON.stringify(json);
    render(<SummaryCellPopover {...getSummaryProps(getBaseRecord({ message }))} />);
    expect(screen.queryByTestId('codeBlock')?.innerHTML).toBe(JSON.stringify(json, null, 2));
  });
});
