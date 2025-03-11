/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiTitle, EuiText, EuiTextColor, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStateSelector } from '../../state_utils';
import { PreviewState } from './types';

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

const isLoadingSelector = (state: PreviewState) => state.isLoadingDocuments;
const documentSourceSelector = (state: PreviewState) => state.documentSource;

export const FieldPreviewHeader = () => {
  const { dataView } = useFieldEditorContext();
  const { controller } = useFieldPreviewContext();
  const isFetchingDocument = useStateSelector(controller.state$, isLoadingSelector);
  const documentSource = useStateSelector(controller.state$, documentSourceSelector);

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
            defaultMessage: 'From: {documentSource}',
            values: {
              documentSource:
                documentSource === 'cluster' ? dataView.getIndexPattern() : i18nTexts.customData,
            },
          })}
        </EuiTextColor>
      </EuiText>
    </div>
  );
};
