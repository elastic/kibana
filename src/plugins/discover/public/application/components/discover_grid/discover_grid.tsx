/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useMemo, useState, useEffect, useCallback, ReactNode } from 'react';
import { isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiDataGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLink,
  EuiPortal,
  EuiTitle,
  useRenderToText,
  htmlIdGenerator,
  EuiButtonEmpty,
  EuiSpacer,
  EuiDataGridColumn,
  EuiDataGridCellValueElementProps,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { DocViewer } from '../doc_viewer/doc_viewer';
import { IndexPattern } from '../../../kibana_services';
import { ElasticSearchHit, DocViewFilterFn } from '../../doc_views/doc_views_types';
import { shortenDottedString } from '../../helpers';

type Direction = 'asc' | 'desc';
type SortArr = [string, Direction];
const kibanaJSON = 'kibana-json';
const geoPoint = 'geo-point';
interface SortObj {
  id: string;
  direction: Direction;
}

interface Props {
  rows: ElasticSearchHit[];
  columns: string[];
  sort: SortArr[];
  ariaLabelledBy: string;
  indexPattern: IndexPattern;
  searchTitle?: string;
  searchDescription?: string;
  sampleSize: number;
  onFilter: DocViewFilterFn;
  useShortDots: boolean;
  showTimeCol: boolean;
  onSort: Function;
  getContextAppHref: (id: string | number | Record<string, unknown>) => string;
  onRemoveColumn: (column: string) => void;
  onAddColumn: (column: string) => void;
}

function CellPopover({
  value,
  onPositiveFilterClick,
  onNegativeFilterClick,
}: {
  value: string | ReactNode;
  onPositiveFilterClick: () => void;
  onNegativeFilterClick: () => void;
}) {
  const node = useMemo(() => <>{value}!</>, [value]);
  const placeholder = i18n.translate('kbn.discover.grid.filterValuePlaceholder', {
    defaultMessage: 'value',
  });
  const text = useRenderToText(node, placeholder);
  return (
    <>
      {value}
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>
          <EuiButtonEmpty
            iconType="magnifyWithPlus"
            aria-label={i18n.translate('kbn.discover.grid.ariaFilterOn', {
              defaultMessage: 'Filter on {value}',
              values: { value: text },
            })}
            onClick={onPositiveFilterClick}
          >
            {i18n.translate('kbn.discover.grid.filterOn', {
              defaultMessage: 'Filter on value',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButtonEmpty
            iconType="magnifyWithMinus"
            aria-label={i18n.translate('kbn.discover.grid.ariaFilterOut', {
              defaultMessage: 'Filter without {value}',
              values: { value: text },
            })}
            color="danger"
            onClick={onNegativeFilterClick}
          >
            {i18n.translate('kbn.discover.grid.filterOut', {
              defaultMessage: 'Filter without value',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

export const DiscoverGrid = function DiscoverGridInner({
  rows,
  columns,
  sort,
  indexPattern,
  ariaLabelledBy,
  searchTitle,
  searchDescription,
  useShortDots,
  onSort,
  sampleSize,
  onFilter,
  getContextAppHref,
  onRemoveColumn,
  onAddColumn,
  showTimeCol,
}: Props) {
  const lowestPageSize = 50;
  const timeString = i18n.translate('kbn.discover.timeLabel', {
    defaultMessage: 'Time',
  });
  const [flyoutRow, setFlyoutRow] = useState<ElasticSearchHit | undefined>(undefined);

  const dataGridColumns = columns.map(
    (columnName): EuiDataGridColumn => {
      const column: EuiDataGridColumn = {
        id: columnName,
        schema: indexPattern.getFieldByName(columnName)?.type,
      };

      // Default DataGrid schemas: boolean, numeric, datetime, json, currency
      // Default indexPattern types: KBN_FIELD_TYPES in src/plugins/data/common/kbn_field_types/types.ts
      switch (column.schema) {
        case 'date':
          column.schema = 'datetime';
          break;
        case 'number':
          column.schema = 'numeric';
          break;
        case '_source':
        case 'object':
          column.schema = kibanaJSON;
          break;
        case 'geo_point':
          column.schema = geoPoint;
          break;
        default:
          column.schema = undefined;
          break;
      }

      if (useShortDots) {
        column.display = <>{shortenDottedString(columnName)}</>;
      }

      return column;
    }
  );

  // Discover always injects a Time column as the first item (unless advance settings turned it off)
  // Have to guard against this to allow users to request the same column again later
  if (showTimeCol) {
    dataGridColumns.unshift({ id: timeString, schema: 'datetime', initialWidth: 172 });
  }

  /**
   * Pagination
   */
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: lowestPageSize });
  const onChangeItemsPerPage = useCallback(
    (pageSize) => setPagination((paginationData) => ({ ...paginationData, pageSize })),
    [setPagination]
  );
  const onChangePage = useCallback(
    (pageIndex) => setPagination((paginationData) => ({ ...paginationData, pageIndex })),
    [setPagination]
  );

  /**
   * Sorting
   */
  const sortingColumns = useMemo(() => sort.map(([id, direction]) => ({ id, direction })), [sort]);
  const onTableSort = useCallback(
    (sortingColumnsData) => {
      onSort(sortingColumnsData.map(({ id, direction }: SortObj) => [id, direction]));
    },
    [onSort]
  );

  /**
   * Visibility and order
   */
  const [visibleColumns, setVisibleColumns] = useState(dataGridColumns.map((obj) => obj.id));
  const mounted = React.useRef(false);
  useEffect(() => {
    // every time a column is added, make it visible
    if (!mounted.current) {
      mounted.current = true;
    } else {
      const newColumns = dataGridColumns.map((obj) => obj.id);
      if (!isEqual(newColumns, visibleColumns)) {
        setVisibleColumns(newColumns);
      }
    }
  }, [dataGridColumns, visibleColumns]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Cell rendering
   */
  const renderCellValue = useMemo(() => {
    const showFilterActions = (isDetails: boolean, fieldName: string) => {
      return isDetails && indexPattern.fields.getByName(fieldName)?.filterable;
    };
    const createFilter = (fieldName: string, row: any, type: '-' | '+') => {
      return onFilter(
        indexPattern.fields.getByName(fieldName),
        indexPattern.flattenHit(row)[fieldName],
        type
      );
    };
    const formattedField = function (row: any, columnId: string) {
      const formattedValue = indexPattern.formatField(row, columnId);

      // TODO Field formatters need to be fixed
      // eslint-disable-next-line react/no-danger
      return <span dangerouslySetInnerHTML={{ __html: formattedValue }} />;
    };

    return ({ rowIndex, columnId, isDetails }: EuiDataGridCellValueElementProps) => {
      const adjustedRowIndex = rowIndex - pagination.pageIndex * pagination.pageSize;
      const row = rows[adjustedRowIndex];
      let value: string | ReactNode;
      value = '-';

      if (typeof row === 'undefined') {
        return value;
      }

      const fieldName = columnId === timeString ? indexPattern.timeFieldName! : columnId;
      value = formattedField(row, fieldName);

      if (showFilterActions(isDetails, fieldName)) {
        return (
          <CellPopover
            value={value}
            onPositiveFilterClick={() => createFilter(fieldName, rows[rowIndex], '+')}
            onNegativeFilterClick={() => createFilter(fieldName, rows[rowIndex], '-')}
          />
        );
      }

      return value;
    };
  }, [indexPattern, onFilter, pagination.pageIndex, pagination.pageSize, rows, timeString]);

  /**
   * Render variables
   */
  const pageCount = Math.ceil(rows.length / pagination.pageSize);
  const isOnLastPage = pagination.pageIndex === pageCount - 1;
  const showDisclaimer = rows.length === sampleSize && isOnLastPage;
  const randomId = useMemo(() => htmlIdGenerator(), []);
  let searchString: ReactNode = <></>;
  if (searchTitle) {
    if (searchDescription) {
      searchString = i18n.translate('kbn.discover.searchGenerationWithDescription', {
        defaultMessage: 'Table generated by search {searchTitle} ({searchDescription})',
        values: { searchTitle, searchDescription },
      });
    } else {
      searchString = i18n.translate('kbn.discover.searchGeneration', {
        defaultMessage: 'Table generated by search {searchTitle}',
        values: { searchTitle },
      });
    }
  }

  if (!rows || !rows.length) {
    return null;
  }

  return (
    <>
      <EuiDataGrid
        aria-labelledby={ariaLabelledBy}
        aria-describedby={String(randomId)}
        inMemory={{ level: 'sorting' }}
        sorting={{ columns: sortingColumns, onSort: onTableSort }}
        rowCount={rows.length}
        columns={dataGridColumns}
        renderCellValue={renderCellValue}
        leadingControlColumns={[
          {
            id: 'openDetails',
            width: 31,
            headerCellRender: () => (
              <EuiScreenReaderOnly>
                <span>
                  {i18n.translate('kbn.discover.controlColumnHeader', {
                    defaultMessage: 'Control column',
                  })}
                </span>
              </EuiScreenReaderOnly>
            ),
            rowCellRender: ({ rowIndex }) => (
              <button
                aria-label={i18n.translate('kbn.discover.grid.viewDoc', {
                  defaultMessage: 'Toggle dialog with details',
                })}
                onClick={() => setFlyoutRow(rows[rowIndex])}
                className="dscTable__buttonToggle"
              >
                <EuiIcon type={typeof flyoutRow === 'undefined' ? 'eye' : 'eyeClosed'} size="s" />
              </button>
            ),
          },
        ]}
        columnVisibility={{
          visibleColumns,
          setVisibleColumns,
        }}
        pagination={{
          ...pagination,
          onChangeItemsPerPage,
          onChangePage,
          pageSizeOptions: [lowestPageSize, 100, 500],
        }}
        toolbarVisibility={{
          showColumnSelector: false,
          showStyleSelector: false,
        }}
        gridStyle={{
          border: 'horizontal',
          fontSize: 's',
          cellPadding: 's',
        }}
        schemaDetectors={[
          {
            type: kibanaJSON,
            detector() {
              return 0; // this schema is always explicitly defined
            },
            comparator() {
              // Eventually this column will be non-sortable: https://github.com/elastic/eui/issues/2623
              return 1;
            },
            sortTextAsc: '', // Eventually this column will be non-sortable: https://github.com/elastic/eui/issues/2623
            sortTextDesc: '', // Eventually this column will be non-sortable: https://github.com/elastic/eui/issues/2623
            icon: '', // Eventually this column will be non-sortable: https://github.com/elastic/eui/issues/2623
            color: '', // Eventually this column will be non-sortable: https://github.com/elastic/eui/issues/2623
          },
          {
            type: geoPoint,
            detector() {
              return 0; // this schema is always explicitly defined
            },
            comparator() {
              // TODO @myasonik this column is not sortable
              return 1;
            },
            sortTextAsc: '',
            sortTextDesc: '',
            icon: 'tokenGeo',
          },
        ]}
        // TODO @dsnide can make edits here per type
        // Types [geoPoint], [kibanaJSON], numeric, datetime
        popoverContents={{
          [geoPoint]: ({ children }) => {
            return <span className="geo-point">{children}</span>;
          },
        }}
      />
      {showDisclaimer && (
        <>
          <p className="dscTable__footer">
            {i18n.translate('kbn.discover.howToSeeOtherMatchingDocumentsDescription', {
              defaultMessage:
                'These are the first {sampleSize} documents matching your search, refine your search to see others. ',
              values: { sampleSize },
            })}
            <a href={`#${ariaLabelledBy}`}>
              {i18n.translate('kbn.discover.backToTopLinkText', {
                defaultMessage: 'Back to top.',
              })}
            </a>
          </p>
        </>
      )}
      {searchString && (
        <EuiScreenReaderOnly>
          <p id={String(randomId)}>{searchString}</p>
        </EuiScreenReaderOnly>
      )}
      {typeof flyoutRow !== 'undefined' && (
        <EuiPortal>
          <EuiFlyout onClose={() => setFlyoutRow(undefined)} size="l" ownFocus>
            <EuiFlyoutHeader hasBorder>
              <EuiFlexGroup alignItems="baseline" justifyContent="spaceBetween">
                <EuiFlexItem>
                  <EuiFlexGroup alignItems="center" gutterSize="none">
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="folderOpen" size="l" />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiTitle className="dscTable__flyoutHeader">
                        <h2>
                          {i18n.translate('kbn.docTable.tableRow.detailHeading', {
                            defaultMessage: 'Expanded document',
                          })}
                        </h2>
                      </EuiTitle>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFlexGroup justifyContent="flexEnd">
                    {indexPattern.isTimeBased() && (
                      <EuiFlexItem grow={false}>
                        <EuiLink href={getContextAppHref ? getContextAppHref(flyoutRow._id) : ''}>
                          {i18n.translate(
                            'kbn.docTable.tableRow.viewSurroundingDocumentsLinkText',
                            {
                              defaultMessage: 'View surrounding documents',
                            }
                          )}
                        </EuiLink>
                      </EuiFlexItem>
                    )}
                    <EuiFlexItem grow={false}>
                      <EuiLink
                        href={`#/doc/${indexPattern.id}/${flyoutRow._index}?id=${encodeURIComponent(
                          flyoutRow._id as string
                        )}`}
                      >
                        {i18n.translate('kbn.docTable.tableRow.viewSingleDocumentLinkText', {
                          defaultMessage: 'View single document',
                        })}
                      </EuiLink>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              <DocViewer
                hit={flyoutRow}
                columns={visibleColumns}
                indexPattern={indexPattern}
                filter={onFilter}
                onRemoveColumn={onRemoveColumn}
                onAddColumn={onAddColumn}
              />
            </EuiFlyoutBody>
          </EuiFlyout>
        </EuiPortal>
      )}
    </>
  );
};
