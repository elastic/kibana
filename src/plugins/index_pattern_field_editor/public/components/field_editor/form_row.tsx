/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { get } from 'lodash';
import React from 'react';
import { ToggleField } from '../../../../es_ui_shared/static/forms/components/fields/toggle_field';
import { UseField } from '../../../../es_ui_shared/static/forms/hook_form_lib/components/use_field';
import { useFormData } from '../../../../es_ui_shared/static/forms/hook_form_lib/hooks/use_form_data';

interface Props {
  title: string;
  formFieldPath: string;
  children: React.ReactNode;
  description?: string | JSX.Element;
  withDividerRule?: boolean;
  'data-test-subj'?: string;
}

export const FormRow = ({
  title,
  description,
  children,
  formFieldPath,
  withDividerRule = false,
  'data-test-subj': dataTestSubj,
}: Props) => {
  const [formData] = useFormData({ watch: formFieldPath });
  const isContentVisible = Boolean(get(formData, formFieldPath));

  return (
    <>
      <EuiFlexGroup data-test-subj={dataTestSubj ?? 'formRow'}>
        <EuiFlexItem grow={false}>
          <UseField
            path={formFieldPath}
            component={ToggleField}
            componentProps={{
              euiFieldProps: {
                label: title,
                showLabel: false,
                'data-test-subj': 'toggle',
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
