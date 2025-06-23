/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiTitle } from '@elastic/eui';
import { SPAN_ID_FIELD, SPAN_NAME_FIELD } from '@kbn/discover-utils';
import React from 'react';
import { FieldHoverActionPopover } from '../../components/field_with_actions/field_hover_popover_action';
import { HighlightField } from '../../components/highlight_field.tsx';

export interface SpanSummaryTitleProps {
  spanName?: string;
  formattedSpanName?: string;
  spanId: string;
  formattedSpanId: string;
  showActions?: boolean;
}

export const SpanSummaryTitle = ({
  spanName,
  spanId,
  formattedSpanId,
  formattedSpanName,
  showActions = true,
}: SpanSummaryTitleProps) => {
  const FieldContent = ({
    children,
    field,
    title,
    value,
  }: {
    children: React.ReactNode;
    field: string;
    title: string;
    value: string;
    showActions: boolean;
  }) => {
    return showActions ? (
      <FieldHoverActionPopover title={title} value={value} field={field}>
        <>{children}</>
      </FieldHoverActionPopover>
    ) : (
      <>{children}</>
    );
  };

  return spanName ? (
    <>
      <div>
        <FieldContent
          title={spanName}
          value={spanName}
          field={SPAN_NAME_FIELD}
          showActions={showActions}
        >
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
        </FieldContent>
      </div>
      <FieldContent title={spanId} value={spanId} field={SPAN_ID_FIELD} showActions={showActions}>
        <HighlightField value={spanId} formattedValue={formattedSpanId} />
      </FieldContent>
    </>
  ) : (
    <FieldContent title={spanId} value={spanId} field={SPAN_ID_FIELD} showActions={showActions}>
      <EuiTitle size="xs">
        <HighlightField value={spanId} formattedValue={formattedSpanId} as="h2" />
      </EuiTitle>
    </FieldContent>
  );
};
