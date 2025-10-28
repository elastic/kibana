/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiText, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { FieldIcon } from '@kbn/field-utils/src/components/field_icon';
import type { TableFieldConfiguration } from '..';

interface NamePopoverContentProps {
  fieldName: string;
  fieldConfig: TableFieldConfiguration;
  cellActions: React.ReactNode;
}

export function NamePopoverContent({
  fieldName,
  fieldConfig,
  cellActions,
}: NamePopoverContentProps) {
  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        {fieldConfig.type && (
          <EuiFlexItem grow={false}>
            <FieldIcon type={fieldConfig.type} size="s" />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiText size="s" className="eui-textBreakWord">
            {fieldName}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      {fieldConfig?.description && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" className="eui-textBreakWord">
            {fieldConfig.description}
          </EuiText>
        </>
      )}
      {cellActions}
    </>
  );
}
