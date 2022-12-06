/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, useContext, useEffect, useMemo } from 'react';
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
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { DiscoverGridContext } from './discover_grid_context';
import { JsonCodeEditor } from '../json_code_editor/json_code_editor';
import { defaultMonacoEditorWidth } from './constants';
import { formatFieldValue } from '../../utils/format_value';
import { formatHit } from '../../utils/format_hit';
import { DataTableRecord, EsHitRecord } from '../../types';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { MAX_DOC_FIELDS_DISPLAYED } from '../../../common';
import { type ShouldShowFieldInTableHandler } from '../../utils/get_should_show_field_handler';

const CELL_CLASS = 'dscDiscoverGrid__cellValue';

export const getRenderCellValueFn =
  (
    dataView: DataView,
    rows: DataTableRecord[] | undefined,
    useNewFieldsApi: boolean,
    shouldShowFieldHandler: ShouldShowFieldInTableHandler,
    maxDocFieldsDisplayed: number,
    closePopover: () => void
  ) =>
  ({ rowIndex, columnId, isDetails, setCellProps }: EuiDataGridCellValueElementProps) => {
    const { uiSettings, fieldFormats } = useDiscoverServices();

    const maxEntries = useMemo(() => uiSettings.get(MAX_DOC_FIELDS_DISPLAYED), [uiSettings]);

    const row = rows ? rows[rowIndex] : undefined;

    const field = dataView.fields.getByName(columnId);
    const ctx = useContext(DiscoverGridContext);

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
      const pairs = useTopLevelObjectColumns
        ? getTopLevelObjectPairs(row.raw, columnId, dataView, shouldShowFieldHandler).slice(
            0,
            maxDocFieldsDisplayed
          )
        : formatHit(row, dataView, shouldShowFieldHandler, maxEntries, fieldFormats);

      return (
        <EuiDescriptionList
          type="inline"
          compressed
          className={classnames('dscDiscoverGrid__descriptionList', CELL_CLASS)}
        >
          {pairs.map(([key, value]) => (
            <Fragment key={key}>
              <EuiDescriptionListTitle>{key}</EuiDescriptionListTitle>
              <EuiDescriptionListDescription
                className="dscDiscoverGrid__descriptionListDescription"
                dangerouslySetInnerHTML={{ __html: value }}
              />
            </Fragment>
          ))}
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

/**
 * Helper function to show top level objects
 * this is used for legacy stuff like displaying products of our ecommerce dataset
 */
function getInnerColumns(fields: Record<string, unknown[]>, columnId: string) {
  return Object.fromEntries(
    Object.entries(fields).filter(([key]) => {
      return key.indexOf(`${columnId}.`) === 0;
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
      aria-label={i18n.translate('discover.grid.closePopover', {
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
        className="dscDiscoverGrid__cellPopover"
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
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
          className="dscDiscoverGrid__cellPopoverValue eui-textBreakWord"
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
  const highlightPairs: Array<[string, string]> = [];
  const sourcePairs: Array<[string, string]> = [];
  Object.entries(innerColumns).forEach(([key, values]) => {
    const subField = dataView.getFieldByName(key);
    const displayKey = dataView.fields.getByName
      ? dataView.fields.getByName(key)?.displayName
      : undefined;
    const formatter = subField
      ? dataView.getFormatterForField(subField)
      : { convert: (v: unknown, ...rest: unknown[]) => String(v) };
    const formatted = (values as unknown[])
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
        pairs.push([displayKey, formatted]);
      }
    } else {
      pairs.push([key, formatted]);
    }
  });
  return [...highlightPairs, ...sourcePairs];
}
