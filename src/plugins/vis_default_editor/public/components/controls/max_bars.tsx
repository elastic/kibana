/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect } from 'react';
import { EuiFormRow, EuiFieldNumber, EuiFieldNumberProps, EuiIconTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { AggParamEditorProps } from '../agg_param_props';

export interface SizeParamEditorProps extends AggParamEditorProps<number | ''> {
  iconTip?: React.ReactNode;
  disabled?: boolean;
}

const autoPlaceholder = i18n.translate('visDefaultEditor.controls.maxBars.autoPlaceholder', {
  defaultMessage: 'Auto',
});

const label = (
  <>
    <FormattedMessage
      id="visDefaultEditor.controls.maxBars.maxBarsLabel"
      defaultMessage="Max bars"
    />{' '}
    <EuiIconTip
      position="right"
      content={
        <FormattedMessage
          id="visDefaultEditor.controls.maxBars.maxBarsHelpText"
          defaultMessage="Intervals will be selected automatically based on the available data. The maximum number of bars can never be greater than the Advanced Setting's {histogramMaxBars}"
          values={{ histogramMaxBars: UI_SETTINGS.HISTOGRAM_MAX_BARS }}
        />
      }
      type="questionInCircle"
    />
  </>
);

function MaxBarsParamEditor({
  disabled,
  iconTip,
  value,
  setValue,
  showValidation,
  setValidity,
  setTouched,
}: SizeParamEditorProps) {
  const { services } = useKibana();
  const uiSettingMaxBars = services.uiSettings?.get(UI_SETTINGS.HISTOGRAM_MAX_BARS);
  const isValid =
    disabled ||
    value === undefined ||
    value === '' ||
    Number(value) > 0 ||
    value < uiSettingMaxBars;

  useEffect(() => {
    setValidity(isValid);
  }, [isValid, setValidity]);

  const onChange: EuiFieldNumberProps['onChange'] = useCallback(
    (ev) => setValue(ev.target.value === '' ? '' : parseFloat(ev.target.value)),
    [setValue]
  );

  return (
    <EuiFormRow
      label={label}
      fullWidth={true}
      isInvalid={showValidation ? !isValid : false}
      display="rowCompressed"
    >
      <EuiFieldNumber
        value={value || ''}
        placeholder={autoPlaceholder}
        onChange={onChange}
        min={1}
        fullWidth
        compressed
        max={uiSettingMaxBars}
        isInvalid={showValidation ? !isValid : false}
        onBlur={setTouched}
        disabled={disabled}
        data-test-subj="maxBarsParamEditor"
      />
    </EuiFormRow>
  );
}

export { MaxBarsParamEditor };
