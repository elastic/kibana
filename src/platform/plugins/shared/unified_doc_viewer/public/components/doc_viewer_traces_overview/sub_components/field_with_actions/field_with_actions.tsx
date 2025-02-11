/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import React, { ReactNode } from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import { PartialFieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import { FieldHoverActionPopover } from './field_hover_popover_action';

const FieldDescription = dynamic(() => import('./field_description'));

export interface FieldWithActionsProps {
  field: string;
  fieldMetadata?: PartialFieldMetadataPlain;
  formattedValue?: string;
  icon?: ReactNode;
  label: string;
  useBadge?: boolean;
  value?: unknown;
  children?: (props: { content: React.ReactNode }) => React.ReactNode | React.ReactNode;
}

export function FieldWithActions({
  field,
  fieldMetadata,
  formattedValue,
  icon,
  label,
  useBadge = false,
  value,
  children,
  ...props
}: FieldWithActionsProps) {
  const hasFieldDescription = !!fieldMetadata?.flat_name;

  return formattedValue && value ? (
    <div {...props}>
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxxs">
                <h3>{label}</h3>
              </EuiTitle>
            </EuiFlexItem>
            {hasFieldDescription && (
              <EuiFlexItem grow={false}>
                <FieldDescription fieldMetadata={fieldMetadata} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={2}>
          <FieldHoverActionPopover title={value} value={value} field={field}>
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
          </FieldHoverActionPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
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
