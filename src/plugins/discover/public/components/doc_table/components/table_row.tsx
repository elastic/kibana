/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, useCallback, useMemo, useState } from 'react';
import classNames from 'classnames';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiIcon } from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/public';
import { Filter } from '@kbn/es-query';
import { formatFieldValue } from '../../../utils/format_value';
import { DocViewer } from '../../../services/doc_views/components/doc_viewer';
import { TableCell } from './table_row/table_cell';
import { formatRow, formatTopLevelObject } from '../utils/row_formatter';
import { DocViewFilterFn } from '../../../services/doc_views/doc_views_types';
import { DataTableRecord, EsHitRecord } from '../../../types';
import { TableRowDetails } from './table_row_details';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import { DOC_HIDE_TIME_COLUMN_SETTING, MAX_DOC_FIELDS_DISPLAYED } from '../../../../common';
import { type ShouldShowFieldInTableHandler } from '../../../utils/get_should_show_field_handler';

export type DocTableRow = EsHitRecord & {
  isAnchor?: boolean;
};

export interface TableRowProps {
  columns: string[];
  filter: DocViewFilterFn;
  filters?: Filter[];
  savedSearchId?: string;
  row: DataTableRecord;
  dataView: DataView;
  useNewFieldsApi: boolean;
  shouldShowFieldHandler: ShouldShowFieldInTableHandler;
  onAddColumn?: (column: string) => void;
  onRemoveColumn?: (column: string) => void;
}

export const TableRow = ({
  filters,
  columns,
  filter,
  savedSearchId,
  row,
  dataView,
  useNewFieldsApi,
  shouldShowFieldHandler,
  onAddColumn,
  onRemoveColumn,
}: TableRowProps) => {
  const { uiSettings, fieldFormats } = useDiscoverServices();
  const [maxEntries, hideTimeColumn] = useMemo(
    () => [
      uiSettings.get(MAX_DOC_FIELDS_DISPLAYED),
      uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false),
    ],
    [uiSettings]
  );
  const [open, setOpen] = useState(false);
  const docTableRowClassName = classNames('kbnDocTable__row', {
    'kbnDocTable__row--highlight': row.isAnchor,
  });
  const anchorDocTableRowSubj = row.isAnchor ? ' docTableAnchorRow' : '';

  const mapping = useMemo(() => dataView.fields.getByName, [dataView]);

  // toggle display of the rows details, a full list of the fields from each row
  const toggleRow = () => setOpen((prevOpen) => !prevOpen);

  /**
   * Fill an element with the value of a field
   */
  const displayField = (fieldName: string) => {
    // If we're formatting the _source column, don't use the regular field formatter,
    // but our Discover mechanism to format a hit in a better human-readable way.
    if (fieldName === '_source') {
      return formatRow(row, dataView, shouldShowFieldHandler, maxEntries, fieldFormats);
    }

    const formattedField = formatFieldValue(
      row.flattened[fieldName],
      row.raw,
      fieldFormats,
      dataView,
      mapping(fieldName)
    );

    return (
      // formatFieldValue always returns sanitized HTML
      // eslint-disable-next-line react/no-danger
      <div className="dscTruncateByHeight" dangerouslySetInnerHTML={{ __html: formattedField }} />
    );
  };
  const inlineFilter = useCallback(
    (column: string, type: '+' | '-') => {
      const field = dataView.fields.getByName(column);
      filter(field!, row.flattened[column], type);
    },
    [filter, dataView.fields, row.flattened]
  );

  const rowCells = [
    <td className="kbnDocTableCell__toggleDetails" key="toggleDetailsCell">
      <EuiButtonEmpty
        onClick={toggleRow}
        size="xs"
        aria-expanded={open}
        aria-label={i18n.translate('discover.docTable.tableRow.toggleRowDetailsButtonAriaLabel', {
          defaultMessage: 'Toggle row details',
        })}
        data-test-subj="docTableExpandToggleColumn"
      >
        {open ? (
          <EuiIcon type="arrowDown" color="text" size="s" />
        ) : (
          <EuiIcon type="arrowRight" color="text" size="s" />
        )}
      </EuiButtonEmpty>
    </td>,
  ];

  if (dataView.timeFieldName && !hideTimeColumn) {
    rowCells.push(
      <TableCell
        key={dataView.timeFieldName}
        timefield={true}
        formatted={displayField(dataView.timeFieldName)}
        filterable={Boolean(mapping(dataView.timeFieldName)?.filterable && filter)}
        column={dataView.timeFieldName}
        inlineFilter={inlineFilter}
      />
    );
  }

  if (columns.length === 0 && useNewFieldsApi) {
    const formatted = formatRow(row, dataView, shouldShowFieldHandler, maxEntries, fieldFormats);

    rowCells.push(
      <TableCell
        key="__document__"
        timefield={false}
        sourcefield={true}
        formatted={formatted}
        filterable={false}
        column="__document__"
        inlineFilter={inlineFilter}
      />
    );
  } else {
    columns.forEach(function (column: string) {
      if (useNewFieldsApi && !mapping(column) && row.raw.fields && !row.raw.fields[column]) {
        const innerColumns = Object.fromEntries(
          Object.entries(row.raw.fields).filter(([key]) => {
            return key.indexOf(`${column}.`) === 0;
          })
        );

        rowCells.push(
          <TableCell
            key={column}
            timefield={false}
            sourcefield={true}
            formatted={formatTopLevelObject(row, innerColumns, dataView, maxEntries)}
            filterable={false}
            column={column}
            inlineFilter={inlineFilter}
          />
        );
      } else {
        // Check whether the field is defined as filterable in the mapping and does
        // NOT have ignored values in it to determine whether we want to allow filtering.
        // We should improve this and show a helpful tooltip why the filter buttons are not
        // there/disabled when there are ignored values.
        const isFilterable = Boolean(
          mapping(column)?.filterable && filter && !row.raw._ignored?.includes(column)
        );
        rowCells.push(
          <TableCell
            key={column}
            timefield={false}
            sourcefield={column === '_source'}
            formatted={displayField(column)}
            filterable={isFilterable}
            column={column}
            inlineFilter={inlineFilter}
          />
        );
      }
    });
  }

  return (
    <Fragment>
      <tr data-test-subj={`docTableRow${anchorDocTableRowSubj}`} className={docTableRowClassName}>
        {rowCells}
      </tr>
      <tr data-test-subj="docTableDetailsRow" className="kbnDocTableDetails__row">
        {open && (
          <TableRowDetails
            colLength={(columns.length || 1) + 2}
            isTimeBased={dataView.isTimeBased()}
            dataView={dataView}
            rowIndex={row.raw._index}
            rowId={row.raw._id}
            columns={columns}
            filters={filters}
            savedSearchId={savedSearchId}
          >
            <DocViewer
              columns={columns}
              filter={filter}
              hit={row}
              dataView={dataView}
              onAddColumn={onAddColumn}
              onRemoveColumn={onRemoveColumn}
            />
          </TableRowDetails>
        )}
      </tr>
    </Fragment>
  );
};
