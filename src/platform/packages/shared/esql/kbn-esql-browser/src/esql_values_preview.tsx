/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiCode,
  EuiFlexGrid,
  EuiSelectable,
  EuiStat,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { max, min } from 'lodash';
import type { ESQLColumn } from '@kbn/es-types';
import { isNumericType } from '@kbn/esql-language';
import { EMPTY_LABEL } from '@kbn/field-formats-common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';

const SELECT_COLUMN_LABEL = i18n.translate('esqlBrowser.valuesPreview.selectAColumnText', {
  defaultMessage: 'Select a column',
});

export const ESQLValuesPreview: React.FC<{
  // The raw values returned by the query — shown as badges or a range stat
  values: string[] | number[];
  // Columns returned by the query — used to detect multi-column errors and determine value type
  columns: ESQLColumn[];
  // Query execution error; when set, renders an error callout instead of values
  error?: Error;
  updateQuery: (column: string) => void;
  // When true and the column is numeric, renders a min/max range stat instead of badges
  isRangeControl?: boolean;
}> = ({ values, error, columns, updateQuery, isRangeControl }) => {
  const [isColumnPopoverOpen, setIsColumnPopoverOpen] = useState(false);

  const columnOptions = useMemo<EuiSelectableOption[]>(
    () => columns.map((column) => ({ label: column.name })),
    [columns]
  );

  const onColumnChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const selectedColumn = newOptions.find((option) => option.checked === 'on');
      if (selectedColumn) {
        updateQuery(selectedColumn.label);
      }
    },
    [updateQuery]
  );

  const range = useMemo(() => {
    if (!isRangeControl || !isNumericType(columns?.[0]?.type)) return;

    const valuesAsNumbers = values.map((v) => Number(v));
    return { min: min(valuesAsNumbers), max: max(valuesAsNumbers) };
  }, [values, isRangeControl, columns]);

  if (error) {
    return (
      <KbnDangerCallout
        announceOnMount
        title={i18n.translate('esqlBrowser.valuesPreview.errorTitle', {
          defaultMessage: 'Error getting values preview',
        })}
        size="s"
        text={error.message}
      />
    );
  }

  if (columns.length > 1) {
    return (
      <KbnWarningCallout
        announceOnMount
        title={i18n.translate('esqlBrowser.valuesPreview.multiColumnErrorTitle', {
          defaultMessage: 'Query must return a single column',
        })}
        size="s"
        data-test-subj="esqlMoreThanOneColumnCallout"
        text={
          <FormattedMessage
            id="esqlBrowser.valuesPreview.multiColumnErrorBody"
            defaultMessage="Your query is currently returning {totalColumns} columns. Choose a column, or use {statsBy} to narrow your query down."
            values={{
              totalColumns: columns.length,
              statsBy: <EuiCode>STATS BY</EuiCode>,
            }}
          />
        }
        actionProps={{
          primary: {
            children: SELECT_COLUMN_LABEL,
            onClick: () => setIsColumnPopoverOpen((v) => !v),
            'data-test-subj': 'chooseColumnBtn',
            popoverProps: {
              'aria-label': i18n.translate('esqlBrowser.valuesPreview.columnsListLabel', {
                defaultMessage: 'Columns',
              }),
              isOpen: isColumnPopoverOpen,
              closePopover: () => setIsColumnPopoverOpen(false),
              children: (
                <EuiSelectable
                  aria-label={SELECT_COLUMN_LABEL}
                  searchable
                  searchProps={{ 'data-test-subj': 'selectableColumnSearch' }}
                  listProps={{ 'data-test-subj': 'selectableColumnList' }}
                  singleSelection="always"
                  options={columnOptions}
                  onChange={onColumnChange}
                  data-test-subj="selectableColumnContainer"
                >
                  {(list, search) => (
                    <>
                      {search}
                      {list}
                    </>
                  )}
                </EuiSelectable>
              ),
            },
          },
        }}
      />
    );
  }

  if (values.length === 0 || columns.length === 0) {
    return (
      <KbnWarningCallout
        announceOnMount
        title={i18n.translate('esqlBrowser.valuesPreview.emptyTitle', {
          defaultMessage: 'No values returned',
        })}
        size="s"
        data-test-subj="esqlNoValuesForControlCallout"
        text={i18n.translate('esqlBrowser.valuesPreview.emptyText', {
          defaultMessage: "This query isn't returning any values. Edit it and run it again.",
        })}
      />
    );
  }

  if (range) {
    return (
      <EuiFlexGrid columns={2} data-test-subj="esqlValuesPreviewRange">
        <EuiStat
          titleSize="s"
          title={range.min}
          description={i18n.translate('esqlBrowser.valuesPreview.minText', {
            defaultMessage: 'Minimum value',
          })}
        />
        <EuiStat
          titleSize="s"
          title={range.max}
          description={i18n.translate('esqlBrowser.valuesPreview.maxText', {
            defaultMessage: 'Maximum value',
          })}
        />
      </EuiFlexGrid>
    );
  }

  const visibleOptions = values.slice(0, 10);
  const hiddenCount = values.length - visibleOptions.length;

  return (
    <div>
      <EuiBadgeGroup data-test-subj="esqlValuesPreviewStrings">
        {visibleOptions.map((option, i) => (
          <EuiBadge key={`${i}-${option}`}>{option === '' ? EMPTY_LABEL : option}</EuiBadge>
        ))}
      </EuiBadgeGroup>
      {hiddenCount > 0 && (
        <p>
          {i18n.translate('esqlBrowser.valuesPreview.hiddenCount', {
            defaultMessage: '+{hiddenCount} more',
            values: { hiddenCount },
          })}
        </p>
      )}
    </div>
  );
};
