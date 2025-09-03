/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiLoadingSpinner, EuiTitle } from '@elastic/eui';
import React from 'react';
import { PartialFieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { FieldHoverActionPopover } from './field_hover_popover_action';

export interface FieldWithActionsProps {
  field: string;
  fieldMetadata?: PartialFieldMetadataPlain;
  fieldMapping?: DataViewField;
  formattedValue: string;
  label: string;
  value: string;
  children: React.ReactNode;
  loading?: boolean;
  showActions?: boolean;
}

export function FieldWithActions({
  field,
  fieldMetadata,
  fieldMapping,
  formattedValue,
  label,
  value,
  loading,
  children,
  showActions = true,
  ...props
}: FieldWithActionsProps) {
  const hasFieldDescription = !!fieldMetadata?.flat_name;

  if (!label) {
    return null;
  }

  const fieldContent = (
    <div className="eui-textBreakWord">
      {loading && <EuiLoadingSpinner size="m" />}
      {children}
    </div>
  );

  return (
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
                <EuiIconTip
                  title={fieldMetadata.flat_name}
                  content={fieldMetadata.short}
                  color="subdued"
                  aria-label={`${fieldMetadata.flat_name}: ${fieldMetadata.short}`}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={2}>
          {showActions ? (
            <FieldHoverActionPopover
              title={value}
              value={value}
              field={field}
              fieldMapping={fieldMapping}
            >
              {fieldContent}
            </FieldHoverActionPopover>
          ) : (
            fieldContent
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
