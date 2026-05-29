/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { checkScript } from '@elastic/micro-jq';
import { i18n } from '@kbn/i18n';
import { EuiFieldText } from '@elastic/eui';

interface JqExpressionInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

export const JqExpressionInput = ({ value, onChange, onBlur }: JqExpressionInputProps) => {
  const isInvalid = value.length > 0 && !checkScript(value);

  return (
    <EuiFieldText
      data-test-subj="filterJq"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      isInvalid={isInvalid}
      placeholder={i18n.translate('console.outputFilter.jq.placeholder', {
        defaultMessage: 'JQ expression',
      })}
      compressed
      fullWidth
    />
  );
};
