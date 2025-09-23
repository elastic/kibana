/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer } from '@elastic/eui';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import { DashboardsSelector } from '@kbn/dashboards-selector';
import { OptionalFieldLabel } from '../optional_field_label';
import { useRuleFormState, useRuleFormDispatch } from '../hooks';
import {
  ALERT_LINK_DASHBOARDS_TITLE,
  ALERT_LINK_DASHBOARDS_PLACEHOLDER,
  ALERT_LINK_DASHBOARDS_LABEL_TOOLTIP_CONTENT,
} from '../translations';
import { LabelWithTooltip } from './label_with_tooltip';

export interface Props {
  contentManagement: ContentManagementPublicStart;
}

export const RuleDashboards = ({ contentManagement }: Props) => {
  const { formData } = useRuleFormState();
  const dispatch = useRuleFormDispatch();
  const dashboardsFormData = useMemo(
    () => formData.artifacts?.dashboards ?? [],
    [formData.artifacts]
  );
  const onChange = (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    const artifacts = {
      ...formData.artifacts,
      dashboards: selectedOptions.map((selectedOption) => ({
        id: selectedOption.value,
      })),
    };
    dispatch({
      type: 'setRuleProperty',
      payload: {
        property: 'artifacts',
        value: artifacts,
      },
    });
  };

  return (
    <>
      <EuiSpacer size="l" />
      <EuiFlexGroup>
        <EuiFlexItem data-test-subj="ruleLinkedDashboards">
          <EuiFormRow
            label={
              <LabelWithTooltip
                labelContent={ALERT_LINK_DASHBOARDS_TITLE}
                tooltipContent={ALERT_LINK_DASHBOARDS_LABEL_TOOLTIP_CONTENT}
              />
            }
            fullWidth
            labelAppend={OptionalFieldLabel}
          >
            <DashboardsSelector
              contentManagement={contentManagement}
              dashboardsFormData={dashboardsFormData}
              onChange={onChange}
              placeholder={ALERT_LINK_DASHBOARDS_PLACEHOLDER}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
