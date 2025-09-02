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
import { DashboardsSelector } from '@kbn/dashboards-selector';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import { OptionalFieldLabel } from '../optional_field_label';
import { useRuleFormState, useRuleFormDispatch } from '../hooks';
import {
  ALERT_LINK_DASHBOARDS_TITLE,
  ALERT_LINK_DASHBOARDS_PLACEHOLDER,
  ALERT_LINK_DASHBOARDS_LABEL_TOOLTIP_CONTENT,
} from '../translations';
import { LabelWithTooltip } from './label_with_tooltip';

export const RuleDashboards = () => {
  const { services } = useKibana();
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
              // services contains dashboard here, does this mean we need to change the CoreStart type?
              dashboardStart={(services as { dashboard: DashboardStart }).dashboard}
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
