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
import { SPAN_ID_FIELD, SPAN_NAME_FIELD } from '@kbn/discover-utils';
import { FieldHoverActionPopover } from '../../components/field_with_actions/field_hover_popover_action';

export interface SpanSummaryTitleProps {
  name?: string;
  id: string;
}

export const SpanSummaryTitle = ({ name, id }: SpanSummaryTitleProps) => {
  return name ? (
    <>
      <div>
        <FieldHoverActionPopover title={name} value={name} field={SPAN_NAME_FIELD}>
          <EuiTitle size="xs">
            <h2>{name}</h2>
          </EuiTitle>
        </FieldHoverActionPopover>
      </div>
      <FieldHoverActionPopover title={id} value={id} field={SPAN_ID_FIELD}>
        <EuiText size="xs" color="subdued">
          {id}
        </EuiText>
      </FieldHoverActionPopover>
    </>
  ) : (
    <FieldHoverActionPopover title={id} value={id} field={SPAN_ID_FIELD}>
      <EuiTitle size="xs">
        <h2>{id}</h2>
      </EuiTitle>
    </FieldHoverActionPopover>
  );
};
