/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiTitle, EuiText, EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useFieldEditorContext } from '../field_editor_context';
import { useFieldPreviewContext } from './field_preview_context';

const i18nTexts = {
  customData: i18n.translate('indexPatternFieldEditor.fieldPreview.subTitle.customData', {
    defaultMessage: 'Custom data',
  }),
};

export const FieldPreviewHeader = () => {
  const { indexPattern } = useFieldEditorContext();
  const { from } = useFieldPreviewContext();
  return (
    <>
      <EuiTitle size="s">
        <h2>
          {i18n.translate('indexPatternFieldEditor.fieldPreview.title', {
            defaultMessage: 'Preview',
          })}
        </h2>
      </EuiTitle>
      <EuiText>
        <EuiTextColor color="subdued">
          {i18n.translate('indexPatternFieldEditor.fieldPreview.subTitle', {
            defaultMessage: 'From: {from}',
            values: { from: from.value === 'cluster' ? indexPattern.title : i18nTexts.customData },
          })}
        </EuiTextColor>
      </EuiText>
    </>
  );
};
