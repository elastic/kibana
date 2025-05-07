/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';
import { HighlightField } from '../../components/highlight_field.tsx';

export interface SpanSummaryTitleProps {
  spanName?: string;
  formattedSpanName?: string;
  id: string;
  formattedId: string;
}

export const SpanSummaryTitle = ({
  spanName,
  id,
  formattedId,
  formattedSpanName,
}: SpanSummaryTitleProps) => {
  const idContent = <HighlightField value={id} formattedValue={formattedId} />;
  return spanName ? (
    <>
      <EuiTitle size="xs">
        <h2>
          <HighlightField
            textSize="m"
            value={spanName}
            formattedValue={formattedSpanName}
            as="strong"
          />
        </h2>
      </EuiTitle>
      {idContent}
    </>
  ) : (
    <EuiTitle size="xs">
      <h2>{idContent}</h2>
    </EuiTitle>
  );
};
