/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { EuiFormRow, EuiIconTip, EuiRange, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import useMount from 'react-use/lib/useMount';

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
