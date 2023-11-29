/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, useContext, useEffect } from 'react';
import classnames from 'classnames';
import { i18n } from '@kbn/i18n';
import { euiLightVars as themeLight, euiDarkVars as themeDark } from '@kbn/ui-theme';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import {
  EuiDataGridCellValueElementProps,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type {
  DataTableRecord,
  EsHitRecord,
  ShouldShowFieldInTableHandler,
  FormattedHit,
} from '@kbn/discover-utils/types';
import { formatFieldValue, formatHit } from '@kbn/discover-utils';
import { UnifiedDataTableContext } from '../table_context';
import { defaultMonacoEditorWidth } from '../constants';
import JsonCodeEditor from '../components/json_code_editor/json_code_editor';

const CELL_CLASS = 'unifiedDataTable__cellValue';

export const getRenderCellValueFn = ({
  dataView,
  rows,
  useNewFieldsApi,
  shouldShowFieldHandler,
  closePopover,
  fieldFormats,
  maxEntries,
  externalCustomRenderers,
  isPlainRecord,
}: {
  dataView: DataView;
  rows: DataTableRecord[] | undefined;
  useNewFieldsApi: boolean;
  shouldShowFieldHandler: ShouldShowFieldInTableHandler;
  closePopover: () => void;
  fieldFormats: FieldFormatsStart;
  maxEntries: number;
  externalCustomRenderers?: Record<
    string,
    (props: EuiDataGridCellValueElementProps) => React.ReactNode
  >;
  isPlainRecord?: boolean;
}) => {
  return ({
    rowIndex,
    columnId,
    isDetails,
    setCellProps,
    colIndex,
    isExpandable,
    isExpanded,
  }: EuiDataGridCellValueElementProps) => {
    if (!!externalCustomRenderers && !!externalCustomRenderers[columnId]) {
      return (
        <>
          {externalCustomRenderers[columnId]({
            rowIndex,
            columnId,
            isDetails,
            setCellProps,
            isExpandable,
            isExpanded,
            colIndex,
          })}
        </>
      );
    }
    const row = rows ? rows[rowIndex] : undefined;

    const field = dataView.fields.getByName(columnId);
    const ctx = useContext(UnifiedDataTableContext);

    useEffect(() => {
      if (row?.isAnchor) {
        setCellProps({
          className: 'dscDocsGrid__cell--highlight',
        });
      } else if (ctx.expanded && row && ctx.expanded.id === row.id) {
        setCellProps({
          style: {
            backgroundColor: ctx.isDarkMode
              ? themeDark.euiColorHighlight
              : themeLight.euiColorHighlight,
          },
        });
      } else {
        setCellProps({ style: undefined });
      }
    }, [ctx, row, setCellProps]);

    if (typeof row === 'undefined') {
      return <span className={CELL_CLASS}>-</span>;
    }

    /**
     * when using the fields api this code is used to show top level objects
     * this is used for legacy stuff like displaying products of our ecommerce dataset
     */
    const useTopLevelObjectColumns = Boolean(
      useNewFieldsApi &&
        !field &&
        row?.raw.fields &&
        !(row.raw.fields as Record<string, unknown[]>)[columnId]
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
      });
    }

    if (field?.type === '_source' || useTopLevelObjectColumns) {
      const pairs: FormattedHit = useTopLevelObjectColumns
        ? getTopLevelObjectPairs(row.raw, columnId, dataView, shouldShowFieldHandler).slice(
            0,
            maxEntries
          )
        : formatHit(row, dataView, shouldShowFieldHandler, maxEntries, fieldFormats);

      return (
        <EuiDescriptionList
          type="inline"
          compressed
          className={classnames('unifiedDataTable__descriptionList', CELL_CLASS)}
        >
          {pairs.map(([fieldDisplayName, value, fieldName]) => {
            // temporary solution for text based mode. As there are a lot of unsupported fields we want to
            // hide the empty one from the Document view
            if (isPlainRecord && fieldName && row.flattened[fieldName] === null) return null;
            return (
              <Fragment key={fieldDisplayName}>
                <EuiDescriptionListTitle className="unifiedDataTable__descriptionListTitle">
                  {fieldDisplayName}
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription
                  className="unifiedDataTable__descriptionListDescription"
                  dangerouslySetInnerHTML={{ __html: value }}
                />
              </Fragment>
            );
          })}
        </EuiDescriptionList>
      );
    }

    return (
      <span
        className={CELL_CLASS}
        // formatFieldValue guarantees sanitized values
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: formatFieldValue(row.flattened[columnId], row.raw, fieldFormats, dataView, field),
        }}
      />
    );
  };
};

/**
 * Helper function to show top level objects
 * this is used for legacy stuff like displaying products of our ecommerce dataset
 */
function getInnerColumns(fields: Record<string, unknown[]>, columnId: string) {
  return Object.fromEntries(
    Object.entries(fields).filter(([key]) => {
      return key.startsWith(`${columnId}.`);
    })
  );
}

function getJSON(columnId: string, row: DataTableRecord, useTopLevelObjectColumns: boolean) {
  const json = useTopLevelObjectColumns
    ? getInnerColumns(row.raw.fields as Record<string, unknown[]>, columnId)
    : row.raw;
  return json as Record<string, unknown>;
}

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
}: {
  row: DataTableRecord;
  field: DataViewField | undefined;
  columnId: string;
  dataView: DataView;
  useTopLevelObjectColumns: boolean;
  fieldFormats: FieldFormatsStart;
  closePopover: () => void;
}) {
  const closeButton = (
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
  );
  if (useTopLevelObjectColumns || field?.type === '_source') {
    return (
      <EuiFlexGroup
        gutterSize="none"
        direction="column"
        justifyContent="flexEnd"
        className="unifiedDataTable__cellPopover"
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="none" responsive={false}>
            <EuiFlexItem grow={false}>{closeButton}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <JsonCodeEditor
            json={getJSON(columnId, row, useTopLevelObjectColumns)}
            width={defaultMonacoEditorWidth}
            height={200}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup gutterSize="none" direction="row" responsive={false}>
      <EuiFlexItem>
        <span
          className="unifiedDataTable__cellPopoverValue eui-textBreakWord"
          // formatFieldValue guarantees sanitized values
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: formatFieldValue(
              row.flattened[columnId],
              row.raw,
              fieldFormats,
              dataView,
              field
            ),
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{closeButton}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
/**
 * Helper function to show top level objects
 * this is used for legacy stuff like displaying products of our ecommerce dataset
 */
function getTopLevelObjectPairs(
  row: EsHitRecord,
  columnId: string,
  dataView: DataView,
  shouldShowFieldHandler: ShouldShowFieldInTableHandler
) {
  const innerColumns = getInnerColumns(row.fields as Record<string, unknown[]>, columnId);
  // Put the most important fields first
  const highlights: Record<string, unknown> = (row.highlight as Record<string, unknown>) ?? {};
  const highlightPairs: FormattedHit = [];
  const sourcePairs: FormattedHit = [];
  Object.entries(innerColumns).forEach(([key, values]) => {
    const subField = dataView.getFieldByName(key);
    const displayKey = dataView.fields.getByName
      ? dataView.fields.getByName(key)?.displayName
      : undefined;
    const formatter = subField
      ? dataView.getFormatterForField(subField)
      : { convert: (v: unknown, ...rest: unknown[]) => String(v) };
    const formatted = values
      .map((val: unknown) =>
        formatter.convert(val, 'html', {
          field: subField,
          hit: row,
        })
      )
      .join(', ');
    const pairs = highlights[key] ? highlightPairs : sourcePairs;
    if (displayKey) {
      if (shouldShowFieldHandler(displayKey)) {
        pairs.push([displayKey, formatted, key]);
      }
    } else {
      pairs.push([key, formatted, key]);
    }
  });
  return [...highlightPairs, ...sourcePairs];
}
