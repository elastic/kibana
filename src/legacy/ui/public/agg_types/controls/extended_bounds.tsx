/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';

import {
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AggParamEditorProps } from 'ui/vis/editors/default';

interface Bounds {
  min: number | string;
  max: number | string;
}

function ExtendedBoundsParamEditor({
  agg,
  aggParam,
  value,
  setValue,
}: AggParamEditorProps<Bounds>) {
  const { min_doc_count, field } = agg.params;

  if (min_doc_count && field && (field.type === 'number' || field.type === 'date')) {
    const mainLabel = i18n.translate('common.ui.aggTypes.extendedBoundsLabel', {
      defaultMessage: 'Extended Bounds',
    });

    const tooltipContent = i18n.translate('common.ui.aggTypes.extendedBoundsTooltip', {
      defaultMessage:
        'Min and Max do not filter the results, but rather extend the bounds of the result set',
    });

    const minLabel = i18n.translate('common.ui.aggTypes.extendedBounds.minLabel', {
      defaultMessage: 'Min',
    });

    const maxLabel = i18n.translate('common.ui.aggTypes.extendedBounds.maxLabel', {
      defaultMessage: 'Max',
    });

    const helpText = i18n.translate('common.ui.aggTypes.extendedBounds.label.optionalText', {
      defaultMessage: 'optional',
    });

    return (
      <div className="visEditorSidebar__aggParamFormRow">
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxxs">
              <label>{mainLabel}</label>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIconTip content={tooltipContent} position="right" />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="xs" />

        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label={minLabel} fullWidth={true} helpText={helpText}>
              <EuiFieldNumber
                value={value.min === '' ? '' : Number(value.min)}
                onChange={ev => {
                  debugger;
                  setValue({ ...value, min: ev.target.value })
                }}
                fullWidth={true}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label={maxLabel} fullWidth={true} helpText={helpText}>
              <EuiFieldNumber
                value={value.max === '' ? '' : Number(value.max)}
                onChange={ev => setValue({ ...value, max: ev.target.value })}
                fullWidth={true}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }

  return null;
}

export { ExtendedBoundsParamEditor };
