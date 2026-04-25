/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiTextProps } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import React, { type ReactNode } from 'react';
import type { FieldConfigValue } from '../../../../content_framework';

interface Props {
  value?: FieldConfigValue;
  formattedValue?: ReactNode;
  children?: (props: { content: ReactNode }) => ReactNode;
  textSize?: EuiTextProps['size'];

  as?: keyof JSX.IntrinsicElements;
}

export function HighlightField({ value, formattedValue, children, textSize = 'xs', as }: Props) {
  const formattedContent = formattedValue ? (
    <FormattedValue value={formattedValue} textSize={textSize} as={as} />
  ) : null;
  const valueContent = value ? <EuiText size={textSize}>{value}</EuiText> : null;
  const content = formattedContent ?? valueContent;

  if (typeof children === 'function') {
    return children({ content });
  }

  return <>{content}</>;
}

const FormattedValue = ({
  value,
  textSize,
  as,
}: {
  value: ReactNode;
  textSize: EuiTextProps['size'];
  as?: keyof JSX.IntrinsicElements;
}) => {
  if (as) {
    const As = as;
    return <As>{value}</As>;
  }
  return (
    <EuiText className="eui-textTruncate" size={textSize}>
      {value}
    </EuiText>
  );
};
