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
import { FieldHoverActionPopover } from '../../components/field_with_actions/field_hover_popover_action';

interface SpanSummaryField {
  field: string;
  value?: string;
}

export interface SpanSummaryTitleProps {
  name: SpanSummaryField;
  id: Required<SpanSummaryField>;
}

export const SpanSummaryTitle = ({ name, id }: SpanSummaryTitleProps) => {
  return name?.value ? (
    <>
      <div>
        <FieldHoverActionPopover title={name.value} value={name.value} field={name.field}>
          <EuiTitle size="xs">
            <h2>{name.value}</h2>
          </EuiTitle>
        </FieldHoverActionPopover>
      </div>
      <FieldHoverActionPopover title={id.value} value={id.value} field={id.field}>
        <EuiText size="xs" color="subdued">
          {id.value}
        </EuiText>
      </FieldHoverActionPopover>
    </>
  ) : (
    <FieldHoverActionPopover title={id.value!} value={id.value} field={id.field}>
      <EuiTitle size="xs">
        <h2>{id.value}</h2>
      </EuiTitle>
    </FieldHoverActionPopover>
  );
};
