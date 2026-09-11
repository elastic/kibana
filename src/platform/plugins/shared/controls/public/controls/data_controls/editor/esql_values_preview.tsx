/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiCallOut,
  EuiFlexGrid,
  EuiStat,
} from '@elastic/eui';
import { max, min } from 'lodash';
import type { ESQLColumn } from '@kbn/es-types';
import { isNumericType } from '@kbn/esql-language';
import { EMPTY_LABEL } from '@kbn/field-formats-common';
import { RANGE_SLIDER_CONTROL } from '@kbn/controls-constants';
import type { DataControlType } from '@kbn/controls-constants';
import { ChooseColumnPopover } from './choose_column_popover';
import { DataControlEditorStrings } from '../data_control_constants';

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
        title={DataControlEditorStrings.manageControl.dataSource.valuesPreview.getErrorTitle()}
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
        title={DataControlEditorStrings.manageControl.dataSource.valuesPreview.getMultiColumnErrorTitle()}
        color="warning"
        iconType="warning"
        size="s"
        data-test-subj="esqlMoreThanOneColumnCallout"
      >
        <p>
          {DataControlEditorStrings.manageControl.dataSource.valuesPreview.getMultiColumnErrorBody(
            previewColumns.length
          )}
        </p>
        <ChooseColumnPopover columns={previewColumns} updateQuery={updateQuery} />
      </EuiCallOut>
    );
  }

  if (isEmpty) {
    return (
      <EuiCallOut
        announceOnMount
        title={DataControlEditorStrings.manageControl.dataSource.valuesPreview.getEmptyTitle()}
        color="warning"
        iconType="warning"
        size="s"
        data-test-subj="esqlMoreThanOneColumnCallout"
      >
        <p>{DataControlEditorStrings.manageControl.dataSource.valuesPreview.getEmptyText()}</p>
      </EuiCallOut>
    );
  }

  if (range) {
    return (
      <EuiFlexGrid columns={2} data-test-subj="esqlValuesPreviewRange">
        <EuiStat
          titleSize="s"
          title={range.min}
          description={DataControlEditorStrings.manageControl.dataSource.valuesPreview.getMinText()}
        />
        <EuiStat
          titleSize="s"
          title={range.max}
          description={DataControlEditorStrings.manageControl.dataSource.valuesPreview.getMaxText()}
        />
      </EuiFlexGrid>
    );
  }

  return (
    <div style={{ maxHeight: '200px', overflow: 'auto' }}>
      <EuiBadgeGroup data-test-subj="esqlValuesPreviewStrings">
        {previewOptions.map((option, i) => (
          <EuiBadge key={`${i}-${option}`}>{option === '' ? EMPTY_LABEL : option}</EuiBadge>
        ))}
      </EuiBadgeGroup>
    </div>
  );
};
