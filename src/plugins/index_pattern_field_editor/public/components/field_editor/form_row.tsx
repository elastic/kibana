/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { get } from 'lodash';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';

import { UseField, ToggleField, useFormData } from '../../shared_imports';

interface Props {
  title: string;
  formFieldPath: string;
  children: React.ReactNode;
  description?: string | JSX.Element;
  withDividerRule?: boolean;
}

export const FormRow = ({
  title,
  description,
  children,
  formFieldPath,
  withDividerRule = false,
}: Props) => {
  const [formData] = useFormData({ watch: formFieldPath });
  const isContentVisible = Boolean(get(formData, formFieldPath));

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <UseField
            path={formFieldPath}
            component={ToggleField}
            componentProps={{
              euiFieldProps: {
                label: title,
                showLabel: false,
                'data-test-subj': 'formRowToggle',
              },
            }}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <div>
            {/* Title */}
            <EuiTitle size="xs">
              <h3>{title}</h3>
            </EuiTitle>
            <EuiSpacer size="xs" />

            {/* Description */}
            <EuiText size="s" color="subdued">
              {description}
            </EuiText>

            {/* Content */}
            {isContentVisible && (
              <>
                <EuiSpacer size="l" />
                {children}
              </>
            )}
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>

      {withDividerRule && <EuiHorizontalRule />}
    </>
  );
};
