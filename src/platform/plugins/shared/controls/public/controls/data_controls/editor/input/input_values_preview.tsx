/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { DataControlEditorStrings } from '../../data_control_constants';
import { ChooseColumnPopover } from './choose_column_popover';

const PREVIEW_VAL_MAX_CARDINALITY = 25;
const PREVIEW_VAL_MAX_CHARS = 40;

export const InputValuesPreview: React.FC<{
  previewOptions: string[];
  previewColumns: string[];
  previewError?: Error;
  updateQuery: (column: string) => void;
  runQuery: () => void;
  runButtonDisabled: boolean;
  isQueryRunning: boolean;
}> = ({
  previewOptions,
  previewError,
  previewColumns,
  updateQuery,
  runQuery,
  runButtonDisabled,
  isQueryRunning,
}) => {
  const isEmpty = useMemo(() => previewOptions.length === 0, [previewOptions]);

  const multiColumnResult = useMemo(() => !!previewColumns.length, [previewColumns]);

  const options = useMemo(() => {
    const totalCardinality = previewOptions.length;
    const visibleOptions = previewOptions.slice(0, PREVIEW_VAL_MAX_CARDINALITY).map((value) => {
      let text = value.slice(0, PREVIEW_VAL_MAX_CHARS);
      if (text.length < value.length) text += '…';
      return { text };
    });
    if (totalCardinality > visibleOptions.length) {
      visibleOptions.push({
        text: DataControlEditorStrings.manageControl.dataSource.valuesPreview.getMoreText(
          totalCardinality - visibleOptions.length
        ),
      });
    }
    return visibleOptions;
  }, [previewOptions]);

  const body =
    // Display only loading spinner when initializing the preview in edit mode, or after selecting a column
    isQueryRunning && (!isEmpty || multiColumnResult) ? (
      <EuiLoadingSpinner size="xl" />
    ) : previewError ? (
      <EuiCallOut
        title={DataControlEditorStrings.manageControl.dataSource.valuesPreview.getErrorTitle()}
        color="danger"
        iconType="error"
        size="s"
      >
        <p>{previewError.message}</p>
        <EuiButtonEmpty isLoading={isQueryRunning} onClick={runQuery} iconType="play">
          {DataControlEditorStrings.manageControl.dataSource.valuesPreview.getRetryButton()}
        </EuiButtonEmpty>
      </EuiCallOut>
    ) : multiColumnResult ? (
      <EuiCallOut
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
          <ChooseColumnPopover columns={previewColumns} updateQuery={updateQuery} />
        </p>
      </EuiCallOut>
    ) : isEmpty ? (
      <>
        <EuiText size="s">
          {DataControlEditorStrings.manageControl.dataSource.valuesPreview.getEmptyText()}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiButton
          disabled={runButtonDisabled}
          isLoading={isQueryRunning}
          onClick={runQuery}
          iconType="play"
        >
          {DataControlEditorStrings.manageControl.dataSource.valuesPreview.getRunQueryButton()}
        </EuiButton>
      </>
    ) : (
      <EuiSelect options={options} />
    );

  const panelColor = previewError ? 'danger' : multiColumnResult ? 'warning' : undefined;

  return (
    <EuiFormRow label={DataControlEditorStrings.manageControl.dataSource.valuesPreview.getTitle()}>
      <EuiPanel
        hasBorder
        color={panelColor}
        css={css`
          text-align: center;
        `}
      >
        {body}
      </EuiPanel>
    </EuiFormRow>
  );
};
