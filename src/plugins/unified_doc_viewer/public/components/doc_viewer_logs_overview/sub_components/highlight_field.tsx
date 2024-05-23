/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiBadge, EuiFlexGroup, EuiText, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { ReactNode } from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import { euiThemeVars } from '@kbn/ui-theme';
import { PartialFieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import { HoverActionPopover } from './hover_popover_action';

const HighlightFieldDescription = dynamic(() => import('./highlight_field_description'));

interface HighlightFieldProps {
  field: string;
  fieldMetadata?: PartialFieldMetadataPlain;
  formattedValue?: string;
  icon?: ReactNode;
  label: string;
  useBadge?: boolean;
  value?: unknown;
}

export function HighlightField({
  field,
  fieldMetadata,
  formattedValue,
  icon,
  label,
  useBadge = false,
  value,
  ...props
}: HighlightFieldProps) {
  const hasFieldDescription = !!fieldMetadata?.short;

  return formattedValue && value ? (
    <div {...props}>
      <EuiFlexGroup responsive={false} alignItems="center" gutterSize="xs">
        <EuiTitle css={fieldNameStyle} size="xxxs">
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
          ) : (
            <EuiText
              className="eui-textTruncate"
              size="s"
              // Value returned from formatFieldValue is always sanitized
              dangerouslySetInnerHTML={{ __html: formattedValue }}
            />
          )}
        </EuiFlexGroup>
      </HoverActionPopover>
    </div>
  ) : null;
}

const fieldNameStyle = css`
  color: ${euiThemeVars.euiColorDarkShade};
`;
