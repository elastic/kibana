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
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer, EuiComboBox } from '@elastic/eui';
import { OptionalFieldLabel } from '../optional_field_label';
import { useRuleFormState, useRuleFormDispatch } from '../hooks';
import {
  ALERT_LINK_ENTITIES_TITLE,
  ALERT_LINK_ENTITIES_PLACEHOLDER,
  ALERT_LINK_ENTITIES_LABEL_TOOLTIP_CONTENT,
} from '../translations';
import { LabelWithTooltip } from './label_with_tooltip';

// Hardcoded list of service names for now
// TODO: Replace with API call to fetch service names using suggestions/terms enum API
const HARDCODED_SERVICE_NAMES = [
  'frontend',
  'weather-forecast-web',
  'backend',
  'api-service',
  'payment-service',
  'user-service',
  'notification-service',
  'analytics-service',
];

export const RuleEntities = () => {
  const { formData } = useRuleFormState();
  const dispatch = useRuleFormDispatch();
  const entitiesFormData = useMemo(() => formData.artifacts?.entities ?? [], [formData.artifacts]);

  const entityOptions = useMemo(() => {
    return HARDCODED_SERVICE_NAMES.map((name) => ({ label: name, value: name }));
  }, []);

  const selectedOptions = useMemo(() => {
    return entitiesFormData.map((entity: string) => ({
      label: entity,
      value: entity,
    }));
  }, [entitiesFormData]);

  const onChange = (options: Array<EuiComboBoxOptionOption<string>>) => {
    const artifacts = {
      ...formData.artifacts,
      entities: options.map((option) => option.value),
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
        <EuiFlexItem data-test-subj="ruleLinkedEntities">
          <EuiFormRow
            label={
              <LabelWithTooltip
                labelContent={ALERT_LINK_ENTITIES_TITLE}
                tooltipContent={ALERT_LINK_ENTITIES_LABEL_TOOLTIP_CONTENT}
              />
            }
            fullWidth
            labelAppend={OptionalFieldLabel}
          >
            <EuiComboBox
              fullWidth
              placeholder={ALERT_LINK_ENTITIES_PLACEHOLDER}
              options={entityOptions}
              selectedOptions={selectedOptions}
              onChange={onChange}
              isClearable
              data-test-subj="ruleEntitiesInput"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
