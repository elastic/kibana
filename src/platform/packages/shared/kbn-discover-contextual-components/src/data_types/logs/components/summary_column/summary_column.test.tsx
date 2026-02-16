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
import { userEvent } from '@testing-library/user-event';
import type {
  AllSummaryColumnProps,
  SummaryColumnFactoryDeps,
  SummaryColumnProps,
} from './summary_column';
import SummaryColumn, { SummaryCellPopover } from './summary_column';
import {
  DataGridDensity,
  ROWS_HEIGHT_OPTIONS,
  type DataTableColumnsMeta,
} from '@kbn/unified-data-table';
import * as constants from '@kbn/discover-utils/src/data_types/logs/constants';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { coreMock as corePluginMock } from '@kbn/core/public/mocks';
import type { DataTableRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { buildDataViewMock, dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { fieldList } from '@kbn/data-views-plugin/common';
import type { IFieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import * as formatValueModule from '@kbn/discover-utils/src/utils/format_value';

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
  fieldFormats: {
    ...fieldFormatsMock,
    getDefaultInstance: jest
      .fn()
      .mockImplementation((...params: Parameters<IFieldFormatsRegistry['getDefaultInstance']>) => ({
        ...fieldFormatsMock.getDefaultInstance(...params),
        convert: jest.fn().mockImplementation((t: string) => String(t)),
      })),
  },
  setCellProps: () => {},
  closePopover: () => {},
  density: DataGridDensity.COMPACT,
  rowHeight: 1,
  onFilter: jest.fn(),
  shouldShowFieldHandler: () => true,
  columnsMeta: undefined,
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
      expect(screen.queryByText('+1')).toBeInTheDocument();
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
      expect(screen.queryByText('+2')).not.toBeInTheDocument();
    });

    it('should display a popover with details and actions upon a badge click', async () => {
      const record = getBaseRecord();
      renderSummary(record);
      // Open badge popover
      await userEvent.click(
        screen.getByTestId(`dataTableCellActionsPopover_${constants.SERVICE_NAME_FIELD}`)
      );

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
        'event.outcome': 'failure',
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

    it('should not display the event.outcome badge if the outcome is not "failure"', () => {
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
        screen.queryByTestId(`dataTableCellActionsPopover_${constants.EVENT_OUTCOME_FIELD}`)
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

    it('should render angle brackets as text (not HTML tags)', () => {
      const message =
        '2026-02-06 04:41:12,718 INFO some.program.module(128):Search for <John Doe> found <48> items in <0.314> seconds';
      const record = getBaseRecord({ message });

      renderSummary(record);

      expect(screen.queryByTestId('discoverDataTableMessageValue')).toHaveTextContent(message);
      expect(document.querySelector('john')).toBeNull();
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

describe('SummaryColumn with columnsMeta', () => {
  let formatFieldValueSpy: jest.SpyInstance;

  beforeEach(() => {
    formatFieldValueSpy = jest
      .spyOn(formatValueModule, 'formatFieldValue')
      .mockReturnValue('formatted');
  });

  afterEach(() => {
    formatFieldValueSpy.mockRestore();
  });

  it('should pass data view field to formatFieldValue when columnsMeta is undefined', () => {
    const testDataView = buildDataViewMock({
      name: 'test-data-view',
      fields: fieldList([
        {
          name: '_index',
          type: 'string',
          scripted: false,
          searchable: true,
          aggregatable: false,
        },
        {
          name: '_source',
          type: '_source',
          scripted: false,
          searchable: false,
          aggregatable: false,
        },
        {
          name: 'bytes',
          type: 'number',
          esTypes: ['long'],
          scripted: false,
          searchable: true,
          aggregatable: true,
        },
        {
          name: '@timestamp',
          type: 'date',
          scripted: false,
          searchable: true,
          aggregatable: true,
        },
      ]),
    });

    const record = buildDataTableRecord(
      {
        fields: {
          '@timestamp': 1726218404776,
          bytes: [100],
        },
      },
      testDataView
    );

    render(
      <SummaryColumn
        {...getSummaryProps(record, {
          dataView: testDataView,
          columnsMeta: undefined,
        })}
      />
    );

    // Should pass the data view field (with type 'number') to formatFieldValue
    const bytesFieldCall = formatFieldValueSpy.mock.calls.find((call) => call[4]?.name === 'bytes');
    expect(bytesFieldCall).toBeDefined();
    expect(bytesFieldCall![4]).toMatchObject({
      name: 'bytes',
      type: 'number',
    });
  });

  it('should pass field with columnsMeta type to formatFieldValue when types differ', () => {
    const testDataView = buildDataViewMock({
      name: 'test-data-view',
      fields: fieldList([
        {
          name: '_index',
          type: 'string',
          scripted: false,
          searchable: true,
          aggregatable: false,
        },
        {
          name: '_source',
          type: '_source',
          scripted: false,
          searchable: false,
          aggregatable: false,
        },
        {
          name: 'bytes',
          type: 'number',
          esTypes: ['long'],
          scripted: false,
          searchable: true,
          aggregatable: true,
        },
        {
          name: '@timestamp',
          type: 'date',
          scripted: false,
          searchable: true,
          aggregatable: true,
        },
      ]),
    });

    const record = buildDataTableRecord(
      {
        fields: {
          '@timestamp': 1726218404776,
          bytes: ['100'],
        },
      },
      testDataView
    );

    // columnsMeta overrides bytes from number to string/keyword
    const columnsMeta: DataTableColumnsMeta = {
      bytes: {
        type: 'string',
        esType: 'keyword',
      },
    };

    render(
      <SummaryColumn
        {...getSummaryProps(record, {
          dataView: testDataView,
          columnsMeta,
        })}
      />
    );

    // Should pass a field with the columnsMeta type (string/keyword) to formatFieldValue
    const bytesFieldCall = formatFieldValueSpy.mock.calls.find((call) => call[4]?.name === 'bytes');
    expect(bytesFieldCall).toBeDefined();
    expect(bytesFieldCall![4]).toMatchObject({
      name: 'bytes',
      type: 'string',
      esTypes: ['keyword'],
    });
  });

  it('should pass field created from columnsMeta to formatFieldValue for fields not in data view', () => {
    const testDataView = buildDataViewMock({
      name: 'test-data-view',
      fields: fieldList([
        {
          name: '_index',
          type: 'string',
          scripted: false,
          searchable: true,
          aggregatable: false,
        },
        {
          name: '_source',
          type: '_source',
          scripted: false,
          searchable: false,
          aggregatable: false,
        },
        {
          name: '@timestamp',
          type: 'date',
          scripted: false,
          searchable: true,
          aggregatable: true,
        },
      ]),
    });

    const record = buildDataTableRecord(
      {
        fields: {
          '@timestamp': 1726218404776,
          custom_esql_field: [42],
        },
      },
      testDataView
    );

    // columnsMeta provides type for a field not in the data view
    const columnsMeta: DataTableColumnsMeta = {
      custom_esql_field: {
        type: 'number',
        esType: 'long',
      },
    };

    render(
      <SummaryColumn
        {...getSummaryProps(record, {
          dataView: testDataView,
          columnsMeta,
        })}
      />
    );

    // Should pass a field created from columnsMeta to formatFieldValue
    const customFieldCall = formatFieldValueSpy.mock.calls.find(
      (call) => call[4]?.name === 'custom_esql_field'
    );
    expect(customFieldCall).toBeDefined();
    expect(customFieldCall![4]).toMatchObject({
      name: 'custom_esql_field',
      type: 'number',
      esTypes: ['long'],
    });
  });
});
