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

import {
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AggParamEditorProps } from 'ui/vis/editors/default';
import { FormattedMessage } from '@kbn/i18n/react';
import { isUndefined } from 'lodash';

interface Bounds {
  min: number | '';
  max: number | '';
}

function areBoundsInvalid({ min, max }: Bounds): boolean {
  if (min === '' && max === '') {
    return false;
  }

  return min > max;
}

function ExtendedBoundsParamEditor({
  agg,
  value,
  setValue,
  setValidity,
}: AggParamEditorProps<Bounds>) {
  const tooltipContent = i18n.translate('common.ui.aggTypes.extendedBoundsTooltip', {
    defaultMessage:
      'Min and Max do not filter the results, but rather extend the bounds of the result set',
  });

  const mainLabel = (
    <span id={`extendedBoundsLabel${agg.id}`}>
      <FormattedMessage
        id="common.ui.aggTypes.extendedBoundsLabel"
        defaultMessage="Extended bounds (optional)"
      />{' '}
      <EuiIconTip position="right" content={tooltipContent} type="questionInCircle" />
    </span>
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

  useEffect(
    () => {
      setValidity(!isInvalid);

      // we reset validity when the element will be hidden
      return () => setValidity(true);
    },
    [value]
  );

  return (
    <EuiFormRow
      fullWidth={true}
      label={mainLabel}
      isInvalid={isInvalid}
      error={error}
      className="visEditorSidebar__aggParamFormRow"
    >
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFieldNumber
            value={isUndefined(value.min) ? '' : value.min}
            onChange={ev =>
              setValue({ ...value, min: ev.target.value === '' ? '' : parseFloat(ev.target.value) })
            }
            fullWidth={true}
            isInvalid={isInvalid}
            aria-labelledby={`extendedBoundsLabel${agg.id} extendedBoundsMinLabel${agg.id}`}
            prepend={
              <EuiText size="xs" id={`extendedBoundsMinLabel${agg.id}`}>
                <strong>{minLabel}</strong>
              </EuiText>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFieldNumber
            value={isUndefined(value.max) ? '' : value.max}
            onChange={ev =>
              setValue({ ...value, max: ev.target.value === '' ? '' : parseFloat(ev.target.value) })
            }
            fullWidth={true}
            isInvalid={isInvalid}
            aria-labelledby={`extendedBoundsLabel${agg.id} extendedBoundsMaxLabel${agg.id}`}
            prepend={
              <EuiText size="xs" id={`extendedBoundsMaxLabel${agg.id}`}>
                <strong>{maxLabel}</strong>
              </EuiText>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
}

export { ExtendedBoundsParamEditor };
