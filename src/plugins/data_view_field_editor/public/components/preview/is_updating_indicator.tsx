/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';

export const IsUpdatingIndicator = () => {
  return (
    <div data-test-subj="isUpdatingIndicator">
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {i18n.translate('indexPatternFieldEditor.fieldPreview.updatingPreviewLabel', {
            defaultMessage: 'Updating...',
          })}
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
