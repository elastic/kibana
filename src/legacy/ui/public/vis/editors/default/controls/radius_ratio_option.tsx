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
import { EuiFormRow, EuiIconTip, EuiRange, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AggControlProps } from './agg_control_props';

const DEFAULT_VALUE = 50;
const PARAM_NAME = 'radiusRatio';

function RadiusRatioOptionControl({ editorStateParams, setValue }: AggControlProps) {
  const label = (
    <>
      <FormattedMessage
        id="common.ui.vis.defaultEditor.controls.dotSizeRatioLabel"
        defaultMessage="Dot size ratio"
      />{' '}
      <EuiIconTip
        content={i18n.translate('common.ui.vis.defaultEditor.controls.dotSizeRatioHelpText', {
          defaultMessage:
            'Change the ratio of the radius of the smallest point to the largest point.',
        })}
        position="right"
      />
    </>
  );

  useEffect(() => {
    if (!editorStateParams.radiusRatio) {
      setValue(editorStateParams, PARAM_NAME, DEFAULT_VALUE);
    }
  }, []);

  return (
    <>
      <EuiFormRow fullWidth={true} label={label} compressed>
        <EuiRange
          compressed
          fullWidth={true}
          min={1}
          max={100}
          value={editorStateParams.radiusRatio || DEFAULT_VALUE}
          onChange={(
            e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLButtonElement>
          ) => setValue(editorStateParams, PARAM_NAME, parseFloat(e.currentTarget.value))}
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
