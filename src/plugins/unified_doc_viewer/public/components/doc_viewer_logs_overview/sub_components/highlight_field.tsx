/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiFlexGroup, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { ReactNode } from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import { PartialFieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import { HoverActionPopover } from './hover_popover_action';

const HighlightFieldDescription = dynamic(() => import('./highlight_field_description'));

export interface HighlightFieldProps {
  field: string;
  fieldMetadata?: PartialFieldMetadataPlain;
  formattedValue?: string;
  icon?: ReactNode;
  label: string;
  useBadge?: boolean;
  value?: unknown;
  children?: (props: { content: React.ReactNode }) => React.ReactNode | React.ReactNode;
}

export function HighlightField({
  field,
  fieldMetadata,
  formattedValue,
  icon,
  label,
  useBadge = false,
  value,
  children,
  ...props
}: HighlightFieldProps) {
  const { euiTheme } = useEuiTheme();

  const hasFieldDescription = !!fieldMetadata?.short;

  return formattedValue && value ? (
    <div {...props}>
      <EuiFlexGroup responsive={false} alignItems="center" gutterSize="xs">
        <EuiTitle
          css={css`
            color: ${euiTheme.colors.textHeading};
          `}
          size="xxxs"
        >
          <span>{label}</span>
        </EuiTitle>
        {hasFieldDescription ? <HighlightFieldDescription fieldMetadata={fieldMetadata} /> : null}
      </EuiFlexGroup>
      <HoverActionPopover title={value} value={value} field={field}>
        <EuiFlexGroup
          responsive={false}
          alignItems="center"
          justifyContent="flexStart"
          gutterSize="xs"
        >
          {icon}
          {useBadge ? (
            <EuiBadge className="eui-textTruncate" color="hollow">
              {formattedValue}
            </EuiBadge>
          ) : typeof children === 'function' ? (
            children({ content: <FormattedValue value={formattedValue} /> })
          ) : (
            <FormattedValue value={formattedValue} />
          )}
        </EuiFlexGroup>
      </HoverActionPopover>
    </div>
  ) : null;
}

const FormattedValue = ({ value }: { value: string }) => (
  <EuiText
    className="eui-textTruncate"
    size="s"
    // Value returned from formatFieldValue is always sanitized
    dangerouslySetInnerHTML={{ __html: value }}
  />
);
