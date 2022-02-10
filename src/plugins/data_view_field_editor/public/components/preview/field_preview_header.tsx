/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiTitle, EuiText, EuiTextColor, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useFieldEditorContext } from '../field_editor_context';
import { useFieldPreviewContext } from './field_preview_context';
import { IsUpdatingIndicator } from './is_updating_indicator';

const i18nTexts = {
  title: i18n.translate('indexPatternFieldEditor.fieldPreview.title', {
    defaultMessage: 'Preview',
  }),
  customData: i18n.translate('indexPatternFieldEditor.fieldPreview.subTitle.customData', {
    defaultMessage: 'Custom data',
  }),
};

export const FieldPreviewHeader = () => {
  const { dataView } = useFieldEditorContext();
  const {
    from,
    currentDocument: { isLoading: isFetchingDocument },
  } = useFieldPreviewContext();

  return (
    <div>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h2 data-test-subj="title">{i18nTexts.title}</h2>
          </EuiTitle>
        </EuiFlexItem>
        {isFetchingDocument && (
          <EuiFlexItem data-test-subj="isFetchingDocumentIndicator">
            <IsUpdatingIndicator />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiText>
        <EuiTextColor color="subdued" data-test-subj="subTitle">
          {i18n.translate('indexPatternFieldEditor.fieldPreview.subTitle', {
            defaultMessage: 'From: {from}',
            values: {
              from: from.value === 'cluster' ? dataView.title : i18nTexts.customData,
            },
          })}
        </EuiTextColor>
      </EuiText>
    </div>
  );
};
