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

import React, { useEffect } from 'react';

import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AggParamEditorProps } from 'ui/vis/editors/default';
import { FormattedMessage } from '@kbn/i18n/react';

interface Bounds {
  min: string;
  max: string;
}

function isBoundEmpty(value: string): boolean {
  return value === '';
}

function areBoundsInvalid({ min, max }: Bounds): boolean {
  if (isBoundEmpty(min) && isBoundEmpty(max)) {
    return false;
  }

  const minValue: number = parseInt(min, 10);
  const maxValue: number = parseInt(max, 10);

  if (isNaN(minValue) || isNaN(maxValue)) {
    return true;
  }

  return minValue > maxValue;
}

function ExtendedBoundsParamEditor({
  agg,
  aggParam,
  value,
  setValue,
  setValidity,
}: AggParamEditorProps<Bounds>) {
  const { min_doc_count: minDocCount, field } = agg.params;

  if (!minDocCount || !field || (field.type !== 'number' && field.type !== 'date')) {
    setValidity(true);
    return null;
  }

  const tooltipContent = i18n.translate('common.ui.aggTypes.extendedBoundsTooltip', {
    defaultMessage:
      'Min and Max do not filter the results, but rather extend the bounds of the result set',
  });

  const mainLabel = (
    <>
      <FormattedMessage
        id="common.ui.aggTypes.extendedBoundsLabel"
        defaultMessage="Extended Bounds"
      />{' '}
      <EuiIconTip
        position="right"
        content={tooltipContent}
        type="questionInCircle"
        aria-label={tooltipContent}
      />
    </>
  );

  const minLabel = i18n.translate('common.ui.aggTypes.extendedBounds.minLabel', {
    defaultMessage: 'Min',
  });

  const maxLabel = i18n.translate('common.ui.aggTypes.extendedBounds.maxLabel', {
    defaultMessage: 'Max',
  });

  const isInvalid = areBoundsInvalid(value);
  let error;

  if (isInvalid) {
    error = i18n.translate('common.ui.aggTypes.extendedBounds.errorMessage', {
      defaultMessage: 'Min should be less than or equal to Max',
    });
  }

  useEffect(() => setValidity(!isInvalid));

  return (
    <EuiFormRow
      fullWidth={true}
      label={mainLabel}
      isInvalid={isInvalid}
      error={error}
      className="visEditorSidebar__aggParamFormRow"
    >
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow label={minLabel} fullWidth={true} isInvalid={isInvalid}>
            <EuiFieldNumber
              value={isBoundEmpty(value.min) ? '' : Number(value.min)}
              onChange={ev => setValue({ ...value, min: ev.target.value })}
              fullWidth={true}
              isInvalid={isInvalid}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label={maxLabel} fullWidth={true} isInvalid={isInvalid}>
            <EuiFieldNumber
              value={isBoundEmpty(value.max) ? '' : Number(value.max)}
              onChange={ev => setValue({ ...value, max: ev.target.value })}
              fullWidth={true}
              isInvalid={isInvalid}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
}

export { ExtendedBoundsParamEditor };
