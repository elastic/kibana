/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextTruncate,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { ReactNode } from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import { HoverActionPopover } from './hover_popover_action';

const HighlightFieldDescription = dynamic(() => import('./highlight_field_description'));

interface HighlightFieldProps {
  useBadge?: boolean;
  field: string;
  formattedValue: string;
  icon?: ReactNode;
  label: string;
  value?: string;
  width: number;
}

export function HighlightField({
  useBadge = false,
  field,
  formattedValue,
  icon,
  label,
  value,
  width,
  ...props
}: HighlightFieldProps) {
  const { euiTheme } = useEuiTheme();

  return formattedValue && value ? (
    <EuiFlexGroup direction="column" gutterSize="none" {...props}>
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiTitle
              css={css`
                color: ${euiTheme.colors.darkShade};
              `}
              size="xxxs"
            >
              <span>{label}</span>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <HighlightFieldDescription fieldName={field} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <HoverActionPopover title={value} value={value} field={field}>
          <EuiFlexGroup
            responsive={false}
            alignItems="center"
            justifyContent="flexStart"
            gutterSize="xs"
          >
            {icon && <EuiFlexItem grow={false}>{icon}</EuiFlexItem>}
            <EuiFlexItem grow={false}>
              <EuiTextTruncate text={formattedValue} truncation="end" width={width}>
                {(truncatedText: string) =>
                  useBadge ? (
                    <EuiBadge color="hollow">{truncatedText}</EuiBadge>
                  ) : (
                    <EuiText
                      size="s"
                      // Value returned from formatFieldValue is always sanitized
                      dangerouslySetInnerHTML={{ __html: truncatedText }}
                    />
                  )
                }
              </EuiTextTruncate>
            </EuiFlexItem>
          </EuiFlexGroup>
        </HoverActionPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : null;
}
