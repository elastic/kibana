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
  EuiBadge,
  EuiBadgeGroup,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGrid,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
} from '@elastic/eui';
import { max, min } from 'lodash';
import { DataControlEditorStrings } from '../../data_control_constants';
import { ChooseColumnPopover } from './choose_column_popover';

export const ESQLValuesPreview: React.FC<{
  previewOptions: string[];
  previewColumns: string[];
  previewError?: Error;
  updateQuery: (column: string) => void;
  runQuery: () => void;
  runButtonDisabled: boolean;
  isQueryRunning: boolean;
  previewFieldMismatchWarning?: {
    esqlField: string;
    dslField: string;
  };
}> = ({
  previewOptions,
  previewError,
  previewColumns,
  updateQuery,
  runQuery,
  runButtonDisabled,
  isQueryRunning,
  previewFieldMismatchWarning,
}) => {
  const isEmpty = useMemo(() => previewOptions.length === 0, [previewOptions]);

  const multiColumnResult = useMemo(() => !!previewColumns.length, [previewColumns]);

  const typeofPreviewValues = useMemo(
    () =>
      isEmpty
        ? 'undefined'
        : previewOptions.every((v: string) => !isNaN(Number(v)))
        ? 'number'
        : 'string',
    [previewOptions, isEmpty]
  );

  const range = useMemo(() => {
    if (typeofPreviewValues !== 'number') return null;
    const optionsAsNumbers = previewOptions.map((v) => Number(v));
    return { min: min(optionsAsNumbers), max: max(optionsAsNumbers) };
  }, [previewOptions, typeofPreviewValues]);

  const body = previewError ? (
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
      </p>
      <ChooseColumnPopover
        isLoading={isQueryRunning}
        columns={previewColumns}
        updateQuery={updateQuery}
      />
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
  ) : range ? (
    <EuiFlexGrid columns={2}>
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
  ) : (
    <div
      css={css`
        max-height: 200px;
        overflow: auto;
      `}
    >
      <EuiBadgeGroup
        css={css`
          justify-content: space-evenly;
        `}
      >
        {previewOptions.map((option, i) => (
          <EuiBadge key={`${i}-${option}`}>{option}</EuiBadge>
        ))}
      </EuiBadgeGroup>
    </div>
  );

  const panelColor = previewError ? 'danger' : multiColumnResult ? 'warning' : undefined;

  return (
    <>
      {previewFieldMismatchWarning && (
        <>
          <EuiCallOut
            title={DataControlEditorStrings.manageControl.dataSource.valuesPreview.getMismatchedFieldWarning(
              previewFieldMismatchWarning.esqlField,
              previewFieldMismatchWarning.dslField
            )}
            size="s"
          />
          <EuiSpacer size="s" />
        </>
      )}
      <EuiFormRow
        label={DataControlEditorStrings.manageControl.dataSource.valuesPreview.getTitle()}
      >
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
    </>
  );
};
