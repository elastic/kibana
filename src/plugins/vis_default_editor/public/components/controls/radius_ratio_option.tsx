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

import React, { useCallback } from 'react';
import { EuiFormRow, EuiIconTip, EuiRange, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useMount } from 'react-use';

import { AggControlProps } from './agg_control_props';

const DEFAULT_VALUE = 50;
const PARAM_NAME = 'radiusRatio';

function RadiusRatioOptionControl({ editorStateParams, setStateParamValue }: AggControlProps) {
  const label = (
    <>
      <FormattedMessage
        id="visDefaultEditor.controls.dotSizeRatioLabel"
        defaultMessage="Dot size ratio"
      />{' '}
      <EuiIconTip
        content={i18n.translate('visDefaultEditor.controls.dotSizeRatioHelpText', {
          defaultMessage:
            'Change the ratio of the radius of the smallest point to the largest point.',
        })}
        position="right"
      />
    </>
  );

  useMount(() => {
    if (!editorStateParams.radiusRatio) {
      setStateParamValue(PARAM_NAME, DEFAULT_VALUE);
    }
  });

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLButtonElement>) =>
      setStateParamValue(PARAM_NAME, parseFloat(e.currentTarget.value)),
    [setStateParamValue]
  );

  return (
    <>
      <EuiFormRow fullWidth={true} label={label} display="rowCompressed">
        <EuiRange
          compressed
          fullWidth={true}
          min={1}
          max={100}
          value={editorStateParams.radiusRatio || DEFAULT_VALUE}
          onChange={onChange}
          showRange
          showValue
          valueAppend="%"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
    </>
  );
}

export { RadiusRatioOptionControl };
