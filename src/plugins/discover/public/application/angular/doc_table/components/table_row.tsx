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
import { getServices, IndexPattern } from '../../../../kibana_services';
import { DOC_HIDE_TIME_COLUMN_SETTING } from '../../../../../common';
import { TableCell } from './table_row/table_cell';
import { formatRow, formatTopLevelObject } from '../../helpers';
import { getContextUrl } from '../../../helpers/get_context_url';
import { DocViewer } from '../../../components/doc_viewer/doc_viewer';
import { DocViewFilterFn, ElasticSearchHit } from '../../../doc_views/doc_views_types';
import { trimAngularSpan } from '../../../components/table/table_helper';
import { TableRowDetails } from './table_row_details';

export type DocTableRow = ElasticSearchHit & {
  isAnchor?: boolean;
};

export interface TableRowProps {
  columns: string[];
  filter: DocViewFilterFn;
  indexPattern: IndexPattern;
  row: DocTableRow;
  onAddColumn?: (column: string) => void;
  onRemoveColumn?: (column: string) => void;
  useNewFieldsApi: boolean;
}

export const TableRow = ({
  columns,
  filter,
  row,
  indexPattern,
  useNewFieldsApi,
  onAddColumn,
  onRemoveColumn,
}: TableRowProps) => {
  const services = getServices();

  const [open, setOpen] = useState(false);
  const docTableRowClassName = classNames('kbnDocTable__row', {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'kbnDocTable__row--highlight': row.isAnchor,
  });
  const anchorDocTableRowSubj = row.isAnchor ? ' docTableAnchorRow' : '';

  const flattenedRow = useMemo(() => indexPattern.flattenHit(row), [indexPattern, row]);
  const mapping = useMemo(() => indexPattern.fields.getByName, [indexPattern]);
  const hideTimeColumn = useMemo(
    () => services.uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false),
    [services]
  );

  // toggle display of the rows details, a full list of the fields from each row
  const toggleRow = () => setOpen((prevOpen) => !prevOpen);

  /**
   * Fill an element with the value of a field
   */
  const _displayField = useCallback(
    (fieldName: string) => {
      const text = indexPattern.formatField(row, fieldName);
      const formattedField = trimAngularSpan(String(text));
      // eslint-disable-next-line react/no-danger
      const fieldElement = <span dangerouslySetInnerHTML={{ __html: formattedField }} />;

      return <div className="truncate-by-height">{fieldElement}</div>;
    },
    [indexPattern, row]
  );

  const inlineFilter = (column: string, type: '+' | '-') => {
    const field = indexPattern.fields.getByName(column);
    filter(field!, flattenedRow[column], type);
  };

  const getContextAppHref = () => {
    return getContextUrl(
      row._id,
      indexPattern.id!,
      columns,
      services.filterManager,
      services.addBasePath
    );
  };

  const getSingleDocHref = () => {
    return services.addBasePath(
      `/app/discover#/doc/${indexPattern.id!}/${row._index}?id=${encodeURIComponent(row._id)}`
    );
  };

  const rowCells = [
    <td className="kbnDocTableCell__toggleDetails" key="toggleDetailsCell">
      <EuiButtonEmpty
        onClick={toggleRow}
        size="xs"
        aria-expanded={!!open}
        aria-label={i18n.translate('discover.docTable.tableRow.toggleRowDetailsButtonAriaLabel', {
          defaultMessage: 'Toggle row details',
        })}
        data-test-subj="docTableExpandToggleColumn"
      >
        {open && <EuiIcon type="arrowDown" color="text" size="s" />}
        {!open && <EuiIcon type="arrowRight" color="text" size="s" />}
      </EuiButtonEmpty>
    </td>,
  ];

  if (indexPattern.timeFieldName && !hideTimeColumn) {
    rowCells.push(
      <TableCell
        key={indexPattern.timeFieldName}
        timefield={true}
        formatted={_displayField(indexPattern.timeFieldName)}
        filterable={Boolean(mapping(indexPattern.timeFieldName)?.filterable && filter)}
        column={indexPattern.timeFieldName}
        inlineFilter={inlineFilter}
      />
    );
  }

  if (columns.length === 0 && useNewFieldsApi) {
    const formatted = formatRow(row, indexPattern);

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
      // when useNewFieldsApi is true, addressing to the fields property is safe
      if (useNewFieldsApi && !mapping(column) && !row.fields![column]) {
        const innerColumns = Object.fromEntries(
          Object.entries(row.fields!).filter(([key]) => {
            return key.indexOf(`${column}.`) === 0;
          })
        );

        rowCells.push(
          <TableCell
            key={column}
            timefield={false}
            sourcefield={true}
            formatted={formatTopLevelObject(row, innerColumns, indexPattern)}
            filterable={false}
            column={column}
            inlineFilter={inlineFilter}
          />
        );
      } else {
        const isFilterable = Boolean(mapping(column) && mapping(column)?.filterable && filter);
        rowCells.push(
          <TableCell
            key={column}
            timefield={false}
            sourcefield={column === '_source'}
            formatted={_displayField(column)}
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
          getContextAppHref={getContextAppHref}
          getSingleDocHref={getSingleDocHref}
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
