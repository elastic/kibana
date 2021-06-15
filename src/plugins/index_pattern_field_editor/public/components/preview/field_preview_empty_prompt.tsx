/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt, EuiText, EuiTextColor, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

export const FieldPreviewEmptyPrompt = () => {
  return (
    <EuiFlexGroup style={{ height: '100%' }}>
      <EuiFlexItem>
        <EuiEmptyPrompt
          iconType="inspect"
          title={
            <h2>
              {i18n.translate('indexPatternFieldEditor.fieldPreview.emptyPromptTitle', {
                defaultMessage: 'Preview',
              })}
            </h2>
          }
          titleSize="s"
          body={
            <EuiText size="s">
              <EuiTextColor color="subdued">
                <p>
                  {i18n.translate('indexPatternFieldEditor.fieldPreview.emptyPromptDescription', {
                    defaultMessage:
                      'Configure field name and value or format to see a preview of how new fields will appear.',
                  })}
                </p>
              </EuiTextColor>
            </EuiText>
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
