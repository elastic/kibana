/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiText } from '@elastic/eui';
import React from 'react';

interface FormattedValueProps {
  value: string;
}

export function FormattedValue({ value }: FormattedValueProps) {
  return (
    <EuiText
      className="eui-textTruncate"
      data-test-subj="ContentFrameworkTableFormattedValue"
      size="xs"
      // Value returned from formatFieldValue is always sanitized
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );
}
