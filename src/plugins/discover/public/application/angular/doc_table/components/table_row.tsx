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
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiIcon,
  EuiLink,
  EuiTitle,
  EuiFlexItem,
} from '@elastic/eui';
import { getServices, IndexPattern } from '../../../../kibana_services';
import { DOC_HIDE_TIME_COLUMN_SETTING } from '../../../../../common';
import { Cell } from './table_row/table_cell';
import { formatRow, formatTopLevelObject } from '../../helpers';
import { getContextUrl } from '../../../helpers/get_context_url';
import { DocViewer } from '../../../components/doc_viewer/doc_viewer';
import { DocViewFilterFn, ElasticSearchHit } from '../../../doc_views/doc_views_types';

// guesstimate at the minimum number of chars wide cells in the table should be
const MIN_LINE_LENGTH = 20;

export type DocTableRow = ElasticSearchHit & {
  isAnchor?: boolean;
};

interface TableRowProps {
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
  const [open, setOpen] = useState(false);
  const docTableRowClassName = classNames('kbnDocTable__row', {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'kbnDocTable__row--highlight': row.isAnchor,
  });
  const anchorDocTableRowSubj = row.isAnchor ? ' docTableAnchorRow' : '';

  const flattenedRow = useMemo(() => indexPattern.flattenHit(row), [indexPattern, row]);
  const mapping = useMemo(() => indexPattern.fields.getByName, [indexPattern]);
  const hideTimeColumn = useMemo(
    () => getServices().uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false),
    []
  );

  // toggle display of the rows details, a full list of the fields from each row
  const toggleRow = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  /**
   * Fill an element with the value of a field
   */
  const _displayField = useCallback(
    (fieldName: string, truncate = false) => {
      const text = indexPattern.formatField(row, fieldName);
      // eslint-disable-next-line react/no-danger
      const fieldElement = <span dangerouslySetInnerHTML={{ __html: text }} />;

      if (truncate && text.length > MIN_LINE_LENGTH) {
        return <div className="truncate-by-height">{fieldElement}</div>;
      }

      return fieldElement;
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
      getServices().filterManager,
      getServices().addBasePath
    );
  };

  const getSingleDocHref = () => {
    return getServices().addBasePath(
      `/app/discover#/doc/${indexPattern.id!}/${row._index}?id=${encodeURIComponent(row._id)}`
    );
  };

  // We just create a string here because its faster.
  const newHtmls = [
    <td className="kbnDocTableCell__toggleDetails">
      <EuiButtonEmpty
        onClick={toggleRow}
        size="xs"
        aria-expanded={!!open}
        aria-label={i18n.translate('discover.docTable.tableRow.toggleRowDetailsButtonAriaLabel', {
          defaultMessage: 'Toggle row details',
        })}
        data-test-subj="docTableExpandToggleColumn"
      >
        {open && <EuiIcon type="arrowDown" size="s" />}
        {!open && <EuiIcon type="arrowRight" size="s" />}
      </EuiButtonEmpty>
    </td>,
  ];

  if (indexPattern.timeFieldName && !hideTimeColumn) {
    newHtmls.push(
      <Cell
        timefield={true}
        formatted={_displayField(indexPattern.timeFieldName)}
        filterable={!!mapping(indexPattern.timeFieldName)?.filterable && !!filter}
        column={indexPattern.timeFieldName}
        inlineFilter={inlineFilter}
      />
    );
  }

  if (columns.length === 0 && useNewFieldsApi) {
    const formatted = formatRow(row, indexPattern);

    newHtmls.push(
      <Cell
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
      const isFilterable = !!mapping(column) && !!mapping(column)?.filterable && !!filter;
      if (useNewFieldsApi && !mapping(column) && !row.fields![column]) {
        const innerColumns = Object.fromEntries(
          Object.entries(row.fields!).filter(([key]) => {
            return key.indexOf(`${column}.`) === 0;
          })
        );
        newHtmls.push(
          <Cell
            timefield={false}
            sourcefield={true}
            formatted={formatTopLevelObject(row, innerColumns, indexPattern)}
            filterable={false}
            column={column}
            inlineFilter={inlineFilter}
          />
        );
      } else {
        newHtmls.push(
          <Cell
            timefield={false}
            sourcefield={column === '_source'}
            formatted={_displayField(column, true)}
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
        {newHtmls}
      </tr>
      <tr data-test-subj="docTableDetailsRow" className="kbnDocTableDetails__row">
        {open && (
          <td colSpan={(columns.length || 1) + 2}>
            <EuiFlexGroup gutterSize="l" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="folderOpen" size="m" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xxs" data-test-subj="docTableRowDetailsTitle">
                      <h4>
                        <FormattedMessage
                          id="discover.docTable.tableRow.detailHeading"
                          defaultMessage="Expanded document"
                        />
                      </h4>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="l" alignItems="center">
                  <EuiFlexItem grow={false}>
                    {indexPattern.isTimeBased() && (
                      <EuiLink data-test-subj="docTableRowAction" href={getContextAppHref()}>
                        <FormattedMessage
                          id="discover.docTable.tableRow.viewSurroundingDocumentsLinkText"
                          defaultMessage="View surrounding documents"
                        />
                      </EuiLink>
                    )}
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiLink data-test-subj="docTableRowAction" href={getSingleDocHref()}>
                      <FormattedMessage
                        id="discover.docTable.tableRow.viewSingleDocumentLinkText"
                        defaultMessage="View single document"
                      />
                    </EuiLink>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
            <div data-test-subj="docViewer">
              <DocViewer
                columns={columns}
                filter={filter}
                hit={row}
                indexPattern={indexPattern}
                onAddColumn={onAddColumn}
                onRemoveColumn={onRemoveColumn}
              />
            </div>
          </td>
        )}
      </tr>
    </Fragment>
  );
};
