/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiBadgeGroup, EuiCallOut, EuiFlexGrid, EuiStat } from '@elastic/eui';
import { max, min } from 'lodash';
import type { ESQLColumn } from '@kbn/es-types';
import { isNumericType } from '@kbn/esql-language';
import { EMPTY_LABEL } from '@kbn/field-formats-common';
import { i18n } from '@kbn/i18n';
import { RANGE_SLIDER_CONTROL } from '@kbn/controls-constants';
import type { DataControlType } from '@kbn/controls-constants';
import { ChooseColumnPopover } from './choose_column_popover';

export const ESQLValuesPreview: React.FC<{
  previewOptions: string[] | number[];
  previewColumns: ESQLColumn[];
  previewError?: Error;
  updateQuery: (column: string) => void;
  selectedControlType?: DataControlType;
}> = ({ previewOptions, previewError, previewColumns, updateQuery, selectedControlType }) => {
  const isEmpty = useMemo(() => previewOptions.length === 0, [previewOptions]);

  const multiColumnResult = useMemo(() => previewColumns.length > 1, [previewColumns]);
  const singleColumn = useMemo(
    () => (previewColumns.length === 1 ? previewColumns[0] : null),
    [previewColumns]
  );

  const range = useMemo(() => {
    if (selectedControlType === RANGE_SLIDER_CONTROL && isNumericType(singleColumn?.type)) {
      const optionsAsNumbers = previewOptions.map((v) => Number(v));
      return { min: min(optionsAsNumbers), max: max(optionsAsNumbers) };
    }
    return null;
  }, [previewOptions, selectedControlType, singleColumn]);

  if (previewError) {
    return (
      <EuiCallOut
        announceOnMount
        title={i18n.translate('esqlUtils.valuesPreview.errorTitle', {
          defaultMessage: 'Error getting values preview',
        })}
        color="danger"
        iconType="error"
        size="s"
      >
        <p>{previewError.message}</p>
      </EuiCallOut>
    );
  }

  if (multiColumnResult) {
    return (
      <EuiCallOut
        announceOnMount
        title={i18n.translate('esqlUtils.valuesPreview.multiColumnErrorTitle', {
          defaultMessage: 'Query must return a single column',
        })}
        color="warning"
        iconType="warning"
        size="s"
        data-test-subj="esqlMoreThanOneColumnCallout"
      >
        <p>
          {i18n.translate('esqlUtils.valuesPreview.multiColumnErrorBody', {
            defaultMessage:
              'Your query is currently returning {totalColumns} columns. Choose a column, or use STATS BY to narrow your query down.',
            values: { totalColumns: previewColumns.length },
          })}
        </p>
        <ChooseColumnPopover columns={previewColumns} updateQuery={updateQuery} />
      </EuiCallOut>
    );
  }

  if (isEmpty) {
    return (
      <EuiCallOut
        announceOnMount
        title={i18n.translate('esqlUtils.valuesPreview.emptyTitle', {
          defaultMessage: 'No values returned',
        })}
        color="warning"
        iconType="warning"
        size="s"
        data-test-subj="esqlNoValuesForControlCallout"
      >
        <p>
          {i18n.translate('esqlUtils.valuesPreview.emptyText', {
            defaultMessage: "This query isn't returning any values. Edit it and run it again.",
          })}
        </p>
      </EuiCallOut>
    );
  }

  if (range) {
    return (
      <EuiFlexGrid columns={2} data-test-subj="esqlValuesPreviewRange">
        <EuiStat
          titleSize="s"
          title={range.min}
          description={i18n.translate('esqlUtils.valuesPreview.minText', {
            defaultMessage: 'Minimum value',
          })}
        />
        <EuiStat
          titleSize="s"
          title={range.max}
          description={i18n.translate('esqlUtils.valuesPreview.maxText', {
            defaultMessage: 'Maximum value',
          })}
        />
      </EuiFlexGrid>
    );
  }

  const visibleOptions = previewOptions.slice(0, 10);
  const hiddenCount = previewOptions.length - visibleOptions.length;

  return (
    <div>
      <EuiBadgeGroup data-test-subj="esqlValuesPreviewStrings">
        {visibleOptions.map((option, i) => (
          <EuiBadge key={`${i}-${option}`}>{option === '' ? EMPTY_LABEL : option}</EuiBadge>
        ))}
      </EuiBadgeGroup>
      {hiddenCount > 0 && (
        <p>
          {i18n.translate('esqlUtils.valuesPreview.hiddenCount', {
            defaultMessage: '+{hiddenCount} more',
            values: { hiddenCount },
          })}
        </p>
      )}
    </div>
  );
};
