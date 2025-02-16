/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiHighlight, EuiText } from '@elastic/eui';

/** Renders a field name in it's non-dragging state */
export const FieldName = React.memo<{
  fieldId: string;
  highlight?: string;
}>(({ fieldId, highlight = '' }) => {
  return (
    <EuiText size="xs">
      <EuiHighlight data-test-subj={`field-${fieldId}-name`} search={highlight}>
        {fieldId}
      </EuiHighlight>
    </EuiText>
  );
});

FieldName.displayName = 'FieldName';
