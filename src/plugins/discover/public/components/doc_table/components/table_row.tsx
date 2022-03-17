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
import { formatFieldValue } from '../../../utils/format_value';
import { flattenHit } from '../../../../../data/public';
import { DataView } from '../../../../../data_views/public';
import { DocViewer } from '../../../services/doc_views/components/doc_viewer';
import { TableCell } from './table_row/table_cell';
import { formatRow, formatTopLevelObject } from '../lib/row_formatter';
import { useNavigationProps } from '../../../utils/use_navigation_props';
import { DocViewFilterFn } from '../../../services/doc_views/doc_views_types';
import { ElasticSearchHit } from '../../../types';
import { TableRowDetails } from './table_row_details';
import { useDiscoverServices } from '../../../utils/use_discover_services';
import { DOC_HIDE_TIME_COLUMN_SETTING, MAX_DOC_FIELDS_DISPLAYED } from '../../../../common';

export type DocTableRow = ElasticSearchHit & {
  isAnchor?: boolean;
};

export interface TableRowProps {
  columns: string[];
  filter: DocViewFilterFn;
  row: DocTableRow;
  indexPattern: DataView;
  useNewFieldsApi: boolean;
  fieldsToShow: string[];
  onAddColumn?: (column: string) => void;
  onRemoveColumn?: (column: string) => void;
}

export const TableRow = ({
  columns,
  filter,
  row,
  indexPattern,
  useNewFieldsApi,
  fieldsToShow,
  onAddColumn,
  onRemoveColumn,
}: TableRowProps) => {
  const { uiSettings, filterManager, fieldFormats, addBasePath } = useDiscoverServices();
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

  const flattenedRow = useMemo(
    () => flattenHit(row, indexPattern, { includeIgnoredValues: true }),
    [indexPattern, row]
  );
  const mapping = useMemo(() => indexPattern.fields.getByName, [indexPattern]);

  // toggle display of the rows details, a full list of the fields from each row
  const toggleRow = () => setOpen((prevOpen) => !prevOpen);

  /**
   * Fill an element with the value of a field
   */
  const displayField = (fieldName: string) => {
    // If we're formatting the _source column, don't use the regular field formatter,
    // but our Discover mechanism to format a hit in a better human-readable way.
    if (fieldName === '_source') {
      return formatRow(row, indexPattern, fieldsToShow, maxEntries, fieldFormats);
    }

    const formattedField = formatFieldValue(
      flattenedRow[fieldName],
      row,
      fieldFormats,
      indexPattern,
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
      const field = indexPattern.fields.getByName(column);
      filter(field!, flattenedRow[column], type);
    },
    [filter, flattenedRow, indexPattern.fields]
  );

  const { singleDocProps, surrDocsProps } = useNavigationProps({
    indexPatternId: indexPattern.id!,
    rowIndex: row._index,
    rowId: row._id,
    filterManager,
    addBasePath,
    columns,
  });

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

  if (indexPattern.timeFieldName && !hideTimeColumn) {
    rowCells.push(
      <TableCell
        key={indexPattern.timeFieldName}
        timefield={true}
        formatted={displayField(indexPattern.timeFieldName)}
        filterable={Boolean(mapping(indexPattern.timeFieldName)?.filterable && filter)}
        column={indexPattern.timeFieldName}
        inlineFilter={inlineFilter}
      />
    );
  }

  if (columns.length === 0 && useNewFieldsApi) {
    const formatted = formatRow(row, indexPattern, fieldsToShow, maxEntries, fieldFormats);

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
      if (useNewFieldsApi && !mapping(column) && row.fields && !row.fields[column]) {
        const innerColumns = Object.fromEntries(
          Object.entries(row.fields).filter(([key]) => {
            return key.indexOf(`${column}.`) === 0;
          })
        );

        rowCells.push(
          <TableCell
            key={column}
            timefield={false}
            sourcefield={true}
            formatted={formatTopLevelObject(row, innerColumns, indexPattern, maxEntries)}
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
          mapping(column)?.filterable && filter && !row._ignored?.includes(column)
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
        <TableRowDetails
          open={open}
          colLength={(columns.length || 1) + 2}
          isTimeBased={indexPattern.isTimeBased()}
          singleDocProps={singleDocProps}
          surrDocsProps={surrDocsProps}
        >
          <DocViewer
            columns={columns}
            filter={filter}
            hit={row}
            indexPattern={indexPattern}
            onAddColumn={onAddColumn}
            onRemoveColumn={onRemoveColumn}
          />
        </TableRowDetails>
      </tr>
    </Fragment>
  );
};
