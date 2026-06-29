/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useContext, memo, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { EuiDataGridCellValueElementProps, EuiTreeViewProps } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiTreeView,
} from '@elastic/eui';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { getDataViewFieldOrCreateFromColumnMeta } from '@kbn/data-view-utils';
import type {
  DataTableColumnsMeta,
  DataTableRecord,
  ShouldShowFieldInTableHandler,
} from '@kbn/discover-utils/types';
import { formatFieldValueReact } from '@kbn/discover-utils';
import { UnifiedDataTableContext } from '../table_context';
import type { CustomCellRenderer } from '../types';
import SourcePopoverContent from '../components/source_popover_content';
import { DataTablePopoverCellValue } from '../components/data_table_cell_value';
import { getInnerColumns } from './columns';

export const CELL_CLASS = 'unifiedDataTable__cellValue';

type CellTreePreviewValue = string | number | boolean | null;
type CellTreeJsonValue =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null
  | undefined;

const HEAVY_NESTED_OBJECT_PREVIEW: CellTreeJsonValue = Object.fromEntries(
  Array.from({ length: 200 }, (_, index) => {
    const fieldNumber = index + 1;

    return [
      `object_${fieldNumber}`,
      {
        id: `id-${fieldNumber}`,
        enabled: fieldNumber % 2 === 0,
        count: fieldNumber,
        tags: ['metrics', `object_${fieldNumber}`, 'demo'],
        agent: {
          name: 'policy_template',
          version: '0.1',
          ephemeral_id: `agent-${fieldNumber}`,
        },
        attributes: {
          event: {
            domain: 'events:metrics',
            name: 'metrics and events',
            kind: 'metric',
          },
          k8s: {
            namespace: 'default',
            pod: {
              name: `metrics-pod-${fieldNumber}`,
              uid: `pod-${fieldNumber}`,
              labels: {
                app: 'metrics',
                tier: 'backend',
              },
            },
          },
        },
        histogram: {
          values: [0.1, 0.2, 0.3, 0.4, 0.5],
          counts: [3, 7, 23, 12, 6],
        },
      },
    ];
  })
);
const ENABLE_CELL_TREE_HEAVY_DEMO = false;

const renderCellTreeValue = (value: CellTreePreviewValue) => (
  <span
    css={({ euiTheme }) => ({
      color:
        value === null
          ? euiTheme.colors.textSubdued
          : typeof value === 'string'
          ? euiTheme.colors.dangerText
          : euiTheme.colors.successText,
      whiteSpace: 'nowrap',
    })}
  >
    {value === null ? 'null' : typeof value === 'string' ? `"${value}"` : String(value)}
  </span>
);

const renderCellTreeLabel = ({
  name,
  value,
  count,
  collectionType = 'object',
  showFilterActions = false,
}: {
  name: string;
  value?: CellTreePreviewValue;
  count?: number;
  collectionType?: 'array' | 'object';
  showFilterActions?: boolean;
}) => (
  <span
    title={
      typeof count === 'number'
        ? `${count} ${collectionType === 'array' ? 'items' : 'fields'}`
        : undefined
    }
    css={({ euiTheme }) => ({
      alignItems: 'center',
      display: 'inline-flex',
      gap: euiTheme.size.xxs,
      fontFamily: euiTheme.font.familyCode,
      fontSize: euiTheme.size.m,
      lineHeight: euiTheme.size.m,
      minWidth: 0,

      '&:hover .unifiedDataTable__cellTreeFilterActions, &:focus-within .unifiedDataTable__cellTreeFilterActions':
        {
          opacity: 1,
        },
    })}
  >
    <span>
      <span css={({ euiTheme }) => ({ color: euiTheme.colors.textSubdued })}>{'"'}</span>
      <span css={({ euiTheme }) => ({ color: euiTheme.colors.text })}>{name}</span>
      <span css={({ euiTheme }) => ({ color: euiTheme.colors.textSubdued })}>{'"'}</span>
    </span>
    <span css={({ euiTheme }) => ({ color: euiTheme.colors.textSubdued })}>:</span>
    {typeof count === 'number' ? (
      <span css={({ euiTheme }) => ({ color: euiTheme.colors.text })}>
        {collectionType === 'array' ? '[' : '{'}
      </span>
    ) : null}
    {typeof value !== 'undefined' ? (
      <>
        {renderCellTreeValue(value)}
        <span css={({ euiTheme }) => ({ color: euiTheme.colors.textSubdued })}>,</span>
      </>
    ) : null}
    {showFilterActions ? (
      <span
        className="unifiedDataTable__cellTreeFilterActions"
        css={({ euiTheme }) => ({
          alignItems: 'center',
          display: 'inline-flex',
          gap: euiTheme.size.xs,
          opacity: 0,
          transition: `opacity ${euiTheme.animation.fast} ${euiTheme.animation.resistance}`,
        })}
      >
        <EuiToolTip
          content={i18n.translate('unifiedDataTable.grid.cellTreeViewPreview.addFilterLabel', {
            defaultMessage: 'Filter for {name}: {value}',
            values: { name, value },
          })}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            aria-label={i18n.translate('unifiedDataTable.grid.cellTreeViewPreview.addFilterLabel', {
              defaultMessage: 'Filter for {name}: {value}',
              values: { name, value },
            })}
            color="text"
            display="empty"
            iconSize="s"
            iconType="plusInCircle"
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            size="xs"
          />
        </EuiToolTip>
        <EuiToolTip
          content={i18n.translate('unifiedDataTable.grid.cellTreeViewPreview.excludeFilterLabel', {
            defaultMessage: 'Filter out {name}: {value}',
            values: { name, value },
          })}
        >
          <EuiButtonIcon
            aria-label={i18n.translate(
              'unifiedDataTable.grid.cellTreeViewPreview.excludeFilterLabel',
              {
                defaultMessage: 'Filter out {name}: {value}',
                values: { name, value },
              }
            )}
            color="text"
            display="empty"
            iconSize="s"
            iconType="minusInCircle"
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            size="xs"
          />
        </EuiToolTip>
      </span>
    ) : null}
  </span>
);

const CELL_TREE_VIEW_PREVIEW_MIN_VISIBLE_ITEMS = 5;
const CELL_TREE_VIEW_PREVIEW_INITIAL_VISIBLE_ITEMS = 10;
const CELL_TREE_VIEW_PREVIEW_INCREMENT = 10;

type CellTreeViewPreviewItem = EuiTreeViewProps['items'][number];
type CellTreeViewExpansionState = Record<string, boolean>;

const isCellTreeObject = (value: CellTreeJsonValue): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const getCellTreeItemId = (path: string[]) => {
  return `cell-tree-${path.join('__')}`;
};

const normalizeCellTreePrimitiveValue = (value: CellTreeJsonValue): CellTreePreviewValue => {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  return null;
};

const buildCellTreeItem = ({
  name,
  path,
  value,
}: {
  name: string;
  path: string[];
  value: CellTreeJsonValue;
}): CellTreeViewPreviewItem => {
  if (Array.isArray(value)) {
    return {
      id: getCellTreeItemId(path),
      label: renderCellTreeLabel({ name, count: value.length, collectionType: 'array' }),
      children: value.map((childValue, index) =>
        buildCellTreeItem({
          name: String(index),
          path: [...path, String(index)],
          value: childValue as CellTreeJsonValue,
        })
      ),
    };
  }

  if (isCellTreeObject(value)) {
    const entries = Object.entries(value);

    return {
      id: getCellTreeItemId(path),
      label: renderCellTreeLabel({ name, count: entries.length }),
      children: entries.map(([childName, childValue]) =>
        buildCellTreeItem({
          name: childName,
          path: [...path, childName],
          value: childValue as CellTreeJsonValue,
        })
      ),
    };
  }

  return {
    id: getCellTreeItemId(path),
    label: renderCellTreeLabel({
      name,
      showFilterActions: true,
      value: normalizeCellTreePrimitiveValue(value),
    }),
  };
};

const buildCellTreeItems = (json: CellTreeJsonValue): EuiTreeViewProps['items'] => {
  if (Array.isArray(json)) {
    return json.map((value, index) =>
      buildCellTreeItem({
        name: String(index),
        path: [String(index)],
        value: value as CellTreeJsonValue,
      })
    );
  }

  if (isCellTreeObject(json)) {
    return Object.entries(json).map(([name, value]) =>
      buildCellTreeItem({
        name,
        path: [name],
        value: value as CellTreeJsonValue,
      })
    );
  }

  return [
    buildCellTreeItem({
      name: 'value',
      path: ['value'],
      value: json,
    }),
  ];
};

const getCellTreeSourceJson = ({
  row,
  dataView,
  columnId,
  useTopLevelObjectColumns,
}: {
  row: DataTableRecord;
  dataView: DataView;
  columnId: string;
  useTopLevelObjectColumns: boolean;
}): CellTreeJsonValue => {
  const sourceJson = useTopLevelObjectColumns
    ? getInnerColumns(row.raw.fields as Record<string, unknown[]>, columnId)
    : row.raw;
  const sourceTreeJson = sourceJson as CellTreeJsonValue;
  const { timeFieldName } = dataView;

  if (!timeFieldName || typeof row.flattened[timeFieldName] === 'undefined') {
    return sourceTreeJson;
  }

  if (isCellTreeObject(sourceTreeJson) && typeof sourceTreeJson[timeFieldName] === 'undefined') {
    return {
      [timeFieldName]: row.flattened[timeFieldName],
      ...sourceTreeJson,
    };
  }

  return sourceTreeJson;
};

const getExpandableCellTreeItemIds = (items: EuiTreeViewProps['items']): string[] =>
  items.flatMap((item) => {
    if (!item.children) {
      return [];
    }

    return [item.id, ...getExpandableCellTreeItemIds(item.children)];
  });

const setCellTreeItemsExpansionState = (
  items: EuiTreeViewProps['items'],
  expansionState: CellTreeViewExpansionState
): EuiTreeViewProps['items'] =>
  items.map((item): CellTreeViewPreviewItem => {
    const children = item.children
      ? setCellTreeItemsExpansionState(item.children, expansionState)
      : undefined;

    return {
      ...item,
      ...(children ? { children, isExpanded: expansionState[item.id] ?? false } : {}),
    };
  });

const CellTreeViewPreview = ({ json }: { json: CellTreeJsonValue }) => {
  const cellTreeItems = useMemo(() => buildCellTreeItems(json), [json]);
  const [visibleItemsCount, setVisibleItemsCount] = useState(
    CELL_TREE_VIEW_PREVIEW_INITIAL_VISIBLE_ITEMS
  );
  const [expansionState, setExpansionState] = useState<CellTreeViewExpansionState>({});
  const [treeRenderVersion, setTreeRenderVersion] = useState(0);
  const visibleItemsLimit = Math.min(visibleItemsCount, cellTreeItems.length);
  const hiddenItemCount = Math.max(cellTreeItems.length - visibleItemsLimit, 0);
  const canHideRows =
    visibleItemsLimit > Math.min(CELL_TREE_VIEW_PREVIEW_MIN_VISIBLE_ITEMS, cellTreeItems.length);
  const rawVisibleItems = cellTreeItems.slice(0, visibleItemsLimit);
  const visibleItems = setCellTreeItemsExpansionState(rawVisibleItems, expansionState);

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            flush="left"
            iconType="arrowDown"
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              event.preventDefault();
              event.stopPropagation();
              const visibleExpandableItemIds = getExpandableCellTreeItemIds(rawVisibleItems);
              setExpansionState((previousExpansionState) => ({
                ...previousExpansionState,
                ...Object.fromEntries(visibleExpandableItemIds.map((id) => [id, true])),
              }));
              setTreeRenderVersion((previousTreeRenderVersion) => previousTreeRenderVersion + 1);
            }}
            size="xs"
          >
            {i18n.translate('unifiedDataTable.grid.cellTreeViewPreview.expandVisibleButtonLabel', {
              defaultMessage: 'Expand visible',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            flush="left"
            iconType="arrowRight"
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              event.preventDefault();
              event.stopPropagation();
              const visibleExpandableItemIds = getExpandableCellTreeItemIds(rawVisibleItems);
              setExpansionState((previousExpansionState) => ({
                ...previousExpansionState,
                ...Object.fromEntries(visibleExpandableItemIds.map((id) => [id, false])),
              }));
              setTreeRenderVersion((previousTreeRenderVersion) => previousTreeRenderVersion + 1);
            }}
            size="xs"
          >
            {i18n.translate(
              'unifiedDataTable.grid.cellTreeViewPreview.collapseVisibleButtonLabel',
              {
                defaultMessage: 'Collapse visible',
              }
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <div
        css={({ euiTheme }) => ({
          fontFamily: euiTheme.font.familyCode,
          fontSize: euiTheme.size.m,
          lineHeight: euiTheme.size.m,

          '.euiTreeView__node': {
            marginBottom: 0,
          },
        })}
      >
        <div>{'{'}</div>
        <EuiTreeView
          aria-label={i18n.translate('unifiedDataTable.grid.cellTreeViewPreview', {
            defaultMessage: 'Cell tree view preview',
          })}
          display="compressed"
          id={`cellTreeViewPreview-${visibleItemsCount}-${treeRenderVersion}`}
          items={visibleItems}
          key={`cellTreeViewPreview-${visibleItemsCount}-${treeRenderVersion}`}
          showExpansionArrows
        />
        <div>{'}'}</div>
      </div>
      {canHideRows || hiddenItemCount > 0 ? (
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          {canHideRows ? (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                flush="left"
                iconType="sortUp"
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const minVisibleItems = cellTreeItems.slice(
                    0,
                    CELL_TREE_VIEW_PREVIEW_MIN_VISIBLE_ITEMS
                  );
                  const minVisibleExpandableItemIds = getExpandableCellTreeItemIds(minVisibleItems);

                  setVisibleItemsCount(
                    Math.min(CELL_TREE_VIEW_PREVIEW_MIN_VISIBLE_ITEMS, cellTreeItems.length)
                  );
                  setExpansionState((previousExpansionState) => ({
                    ...previousExpansionState,
                    ...Object.fromEntries(minVisibleExpandableItemIds.map((id) => [id, false])),
                  }));
                  setTreeRenderVersion(
                    (previousTreeRenderVersion) => previousTreeRenderVersion + 1
                  );
                }}
                size="xs"
              >
                {i18n.translate(
                  'unifiedDataTable.grid.cellTreeViewPreview.hideAllRowsButtonLabel',
                  {
                    defaultMessage: 'Hide all rows',
                  }
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
          ) : null}
          {hiddenItemCount > 0 ? (
            <>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  flush="left"
                  iconType="sortDown"
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setVisibleItemsCount((previousVisibleItemsCount) =>
                      Math.min(
                        previousVisibleItemsCount + CELL_TREE_VIEW_PREVIEW_INCREMENT,
                        cellTreeItems.length
                      )
                    );
                  }}
                  size="xs"
                >
                  {i18n.translate(
                    'unifiedDataTable.grid.cellTreeViewPreview.showMoreFieldsButtonLabel',
                    {
                      defaultMessage: 'Show 10 more fields',
                    }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  flush="left"
                  iconType="list"
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setVisibleItemsCount(cellTreeItems.length);
                  }}
                  size="xs"
                >
                  {i18n.translate(
                    'unifiedDataTable.grid.cellTreeViewPreview.showFullObjectButtonLabel',
                    {
                      defaultMessage: 'Show full object',
                    }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </>
          ) : null}
        </EuiFlexGroup>
      ) : null}
    </>
  );
};

const IS_JEST_ENVIRONMENT = typeof jest !== 'undefined';

export const getRenderCellValueFn = ({
  dataView,
  rows,
  shouldShowFieldHandler,
  closePopover,
  fieldFormats,
  maxEntries,
  externalCustomRenderers,
  isPlainRecord,
  isCompressed = true,
  columnsMeta,
}: {
  dataView: DataView;
  rows: DataTableRecord[] | undefined;
  shouldShowFieldHandler: ShouldShowFieldInTableHandler;
  closePopover: () => void;
  fieldFormats: FieldFormatsStart;
  maxEntries: number;
  externalCustomRenderers?: CustomCellRenderer;
  isPlainRecord?: boolean;
  isCompressed?: boolean;
  columnsMeta: DataTableColumnsMeta | undefined;
}) => {
  const UnifiedDataTableRenderCellValue = ({
    rowIndex,
    columnId,
    isDetails,
    setCellProps,
    colIndex,
    isExpandable,
    isExpanded,
  }: EuiDataGridCellValueElementProps) => {
    const row = rows ? rows[rowIndex] : undefined;
    const field = getDataViewFieldOrCreateFromColumnMeta({
      dataView,
      fieldName: columnId,
      columnMeta: columnsMeta?.[columnId],
    });
    const ctx = useContext(UnifiedDataTableContext);

    useEffect(() => {
      if (row?.isAnchor) {
        setCellProps({
          className: 'unifiedDataTable__cell--highlight',
        });
      } else if (ctx.expanded && row && ctx.expanded.id === row.id) {
        setCellProps({
          className: 'unifiedDataTable__cell--expanded',
        });
      } else {
        setCellProps({ style: undefined });
      }
      // re-apply styles if `columnId` changes, e.g. when reordering columns in the grid
    }, [ctx, row, setCellProps, columnId]);

    if (typeof row === 'undefined') {
      return <span className={CELL_CLASS}>-</span>;
    }

    const CustomCellRenderer = externalCustomRenderers?.[columnId];

    if (CustomCellRenderer) {
      return (
        <span className={CELL_CLASS}>
          <CustomCellRenderer
            rowIndex={rowIndex}
            columnId={columnId}
            isDetails={isDetails}
            setCellProps={setCellProps}
            isExpandable={isExpandable}
            isExpanded={isExpanded}
            colIndex={colIndex}
            row={row}
            dataView={dataView}
            fieldFormats={fieldFormats}
            closePopover={closePopover}
            isCompressed={isCompressed}
            columnsMeta={columnsMeta}
          />
        </span>
      );
    }

    /**
     * when using the fields api this code is used to show top level objects
     * this is used for legacy stuff like displaying products of our ecommerce dataset
     */
    const useTopLevelObjectColumns = Boolean(
      !field && row?.raw.fields && !(row.raw.fields as Record<string, unknown[]>)[columnId]
    );

    if (isDetails) {
      return renderPopoverContent({
        row,
        field,
        columnId,
        dataView,
        useTopLevelObjectColumns,
        fieldFormats,
        closePopover,
        isPlainRecord,
      });
    }

    if (
      field?.type === '_source' ||
      useTopLevelObjectColumns ||
      (isPlainRecord && columnId === '_source')
    ) {
      return (
        <div
          className={CELL_CLASS}
          css={({ euiTheme }) => ({
            padding: `${euiTheme.size.xs} 0`,
          })}
        >
          <CellTreeViewPreview
            json={
              ENABLE_CELL_TREE_HEAVY_DEMO
                ? HEAVY_NESTED_OBJECT_PREVIEW
                : getCellTreeSourceJson({
                    row,
                    dataView,
                    columnId,
                    useTopLevelObjectColumns,
                  })
            }
          />
        </div>
      );
    }

    if (columnId === dataView.timeFieldName) {
      return (
        <span className={CELL_CLASS}>
          {formatFieldValueReact({
            value: row.flattened[columnId],
            hit: row.raw,
            fieldFormats,
            dataView,
            field,
          })}
        </span>
      );
    }

    return (
      <div
        className={CELL_CLASS}
        css={({ euiTheme }) => ({
          padding: `${euiTheme.size.xs} 0`,
        })}
      >
        <CellTreeViewPreview json={row.flattened[columnId] as CellTreeJsonValue} />
      </div>
    );
  };

  // When memoizing renderCellValue, the following warning is logged in Jest tests:
  // Failed prop type: Invalid prop `renderCellValue` supplied to `EuiDataGridCellContent`, expected one of type [function].
  // This is due to incorrect prop type validation that EUI generates for testing components in Jest,
  // but is not an actual issue encountered outside of tests
  return IS_JEST_ENVIRONMENT
    ? UnifiedDataTableRenderCellValue
    : memo(UnifiedDataTableRenderCellValue);
};

/**
 * Helper function for the cell popover
 */
function renderPopoverContent({
  row,
  field,
  columnId,
  dataView,
  useTopLevelObjectColumns,
  fieldFormats,
  closePopover,
  isPlainRecord,
}: {
  row: DataTableRecord;
  field: DataViewField | undefined;
  columnId: string;
  dataView: DataView;
  useTopLevelObjectColumns: boolean;
  fieldFormats: FieldFormatsStart;
  closePopover: () => void;
  isPlainRecord?: boolean;
}) {
  const closeButton = (
    <EuiToolTip
      content={i18n.translate('unifiedDataTable.grid.closePopover', {
        defaultMessage: `Close popover`,
      })}
      disableScreenReaderOutput
    >
      <EuiButtonIcon
        aria-label={i18n.translate('unifiedDataTable.grid.closePopover', {
          defaultMessage: `Close popover`,
        })}
        data-test-subj="docTableClosePopover"
        iconSize="s"
        iconType="cross"
        size="xs"
        onClick={closePopover}
      />
    </EuiToolTip>
  );
  if (
    useTopLevelObjectColumns ||
    field?.type === '_source' ||
    (isPlainRecord && columnId === '_source')
  ) {
    return (
      <SourcePopoverContent
        row={row}
        columnId={columnId}
        useTopLevelObjectColumns={useTopLevelObjectColumns}
        closeButton={closeButton}
      />
    );
  }

  return (
    <EuiFlexGroup
      gutterSize="none"
      direction="row"
      responsive={false}
      data-test-subj="dataTableExpandCellActionPopover"
    >
      <EuiFlexItem>
        <DataTablePopoverCellValue>
          <span>
            {formatFieldValueReact({
              value: row.flattened[columnId],
              hit: row.raw,
              fieldFormats,
              dataView,
              field,
            })}
          </span>
        </DataTablePopoverCellValue>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{closeButton}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
