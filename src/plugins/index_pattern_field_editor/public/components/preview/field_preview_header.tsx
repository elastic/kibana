/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiTitle,
  EuiText,
  EuiTextColor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useFieldEditorContext } from '../field_editor_context';
import { useFieldPreviewContext } from './field_preview_context';

const i18nTexts = {
  title: i18n.translate('indexPatternFieldEditor.fieldPreview.title', {
    defaultMessage: 'Preview',
  }),
  customData: i18n.translate('indexPatternFieldEditor.fieldPreview.subTitle.customData', {
    defaultMessage: 'Custom data',
  }),
  updatingLabel: i18n.translate('indexPatternFieldEditor.fieldPreview.updatingPreviewLabel', {
    defaultMessage: 'Updating...',
  }),
};

export const FieldPreviewHeader = () => {
  const { indexPattern } = useFieldEditorContext();
  const {
    from,
    isLoadingPreview,
    currentDocument: { isLoading },
  } = useFieldPreviewContext();

  const isUpdating = isLoadingPreview || isLoading;

  return (
    <div>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h2 data-test-subj="title">{i18nTexts.title}</h2>
          </EuiTitle>
        </EuiFlexItem>

        {isUpdating && (
          <EuiFlexItem data-test-subj="isUpdatingIndicator">
            <EuiFlexGroup gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{i18nTexts.updatingLabel}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiText>
        <EuiTextColor color="subdued" data-test-subj="subTitle">
          {i18n.translate('indexPatternFieldEditor.fieldPreview.subTitle', {
            defaultMessage: 'From: {from}',
            values: {
              from: from.value === 'cluster' ? indexPattern.title : i18nTexts.customData,
            },
          })}
        </EuiTextColor>
      </EuiText>
    </div>
  );
};
