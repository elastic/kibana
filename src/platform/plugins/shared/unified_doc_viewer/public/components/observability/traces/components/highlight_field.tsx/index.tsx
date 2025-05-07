/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiText, EuiTextProps } from '@elastic/eui';
import React from 'react';
import { FieldConfigValue } from '../../resources/get_field_configuration';

interface Props {
  value?: FieldConfigValue;
  formattedValue?: string;
  children?: (props: { content: React.ReactNode }) => React.ReactNode | React.ReactNode;
  textSize?: EuiTextProps['size'];
}

export function HighlightField({ value, formattedValue, children, textSize = 'xs' }: Props) {
  const formattedContent = formattedValue ? (
    typeof children === 'function' ? (
      children({ content: <FormattedValue value={formattedValue} textSize={textSize} /> })
    ) : (
      <FormattedValue value={formattedValue} textSize={textSize} />
    )
  ) : undefined;
  return (
    <div className="eui-textTruncate">
      {formattedContent ? formattedContent : <EuiText size={textSize}>{value}</EuiText>}
    </div>
  );
}

const FormattedValue = ({ value, textSize }: { value: string; textSize: EuiTextProps['size'] }) => (
  <EuiText
    className="eui-textTruncate"
    size={textSize}
    // Value returned from formatFieldValue is always sanitized
    dangerouslySetInnerHTML={{ __html: value }}
  />
);
