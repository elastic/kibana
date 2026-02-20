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
import { DataGridDensity, ROWS_HEIGHT_OPTIONS } from '@kbn/unified-data-table';
import * as constants from '@kbn/discover-utils';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { coreMock as corePluginMock } from '@kbn/core/public/mocks';
import type { DataTableRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { IFieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import type { DataView, FieldSpec } from '@kbn/data-views-plugin/public';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { fieldList } from '@kbn/data-views-plugin/common';

const dataViewMock: DataView = (() => {
  const shallowMockedFields: FieldSpec[] = [
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
    {
      name: 'message',
      type: 'string',
      scripted: false,
      searchable: false,
      aggregatable: false,
    },
    {
      name: constants.EVENT_ORIGINAL_FIELD,
      type: 'string',
      scripted: false,
      searchable: false,
      aggregatable: false,
    },
  ];

  const fields = fieldList(shallowMockedFields);
  fields.create = (spec: FieldSpec) => new DataViewField(spec);
  fields.getByName = (fieldName: string) => fields.find((field) => field.name === fieldName);
  fields.getByType = (fieldType: string) => fields.filter((field) => field.type === fieldType);
  fields.getAll = () => fields;

  return {
    id: 'the-data-view-id',
    title: 'the-data-view-title',
    name: 'the-data-view',
    type: 'default',
    metaFields: ['_index', '_score'],
    fields,
    getName: () => 'the-data-view',
    getComputedFields: () => ({ docvalueFields: [], scriptFields: {}, runtimeFields: {} }),
    getSourceFiltering: () => ({}),
    getIndexPattern: () => 'the-data-view-title',
    getFieldByName: jest.fn((fieldName: string) => fields.getByName(fieldName)),
    timeFieldName: '@timestamp',
    docvalueFields: [],
    getFormatterForField: jest.fn(() => ({ convert: (value: unknown) => value })),
    isTimeBased: () => true,
    isTimeNanosBased: () => false,
    isPersisted: () => true,
    toSpec: () => ({ id: 'the-data-view-id', title: 'the-data-view-title', name: 'the-data-view' }),
    toMinimalSpec: () => ({
      id: 'the-data-view-id',
      title: 'the-data-view-title',
      name: 'the-data-view',
    }),
    getTimeField: () => fields.getByName('@timestamp'),
    getScriptedField: () => fields.getByName('@timestamp'),
    getRuntimeField: () => null,
    getAllowHidden: () => false,
    isTSDBMode: () => false,
    setFieldCount: jest.fn(),
  } as unknown as DataView;
})();

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

  describe('when rendering popover content', () => {
    it('should use formatted field content when available', () => {
      const record = getBaseRecord({
        message: undefined,
        [constants.EVENT_ORIGINAL_FIELD]: '{"message": "formatted"}',
      });
      const props = getSummaryProps(record, { isDetails: true });
      render(<SummaryCellPopover {...props} />);
      expect(screen.getByTestId('codeBlock')).toHaveTextContent('"message": "formatted"');
    });
  });
});
