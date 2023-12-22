/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';

import { isUndefined } from 'lodash';
import { 
  EuiFormRow,
  EuiFieldNumber,
  EuiFieldNumberProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiSwitchProps,
} from '@elastic/eui';
import { AggParamEditorProps } from '../agg_param_props';
import { i18n } from '@kbn/i18n';

type IpPrefixInfo = {
  prefixLength: number;
  isIpv6: boolean;
};

let ipPrefixObject: IpPrefixInfo = {
  prefixLength: 0,
  isIpv6: false
};

const prefixLengthLabel = i18n.translate('visDefaultEditor.controls.IpPrefix.prefixLength', {
  defaultMessage: 'Prefix Length',
});

const isIpv6Label = i18n.translate('visDefaultEditor.controls.IpPrefix.isIpv6', {
  defaultMessage: 'Prefix applies to IPv6 addresses',
});

function IpPrefixParamEditor({
  agg,
  value,
  setTouched,
  setValue,
  setValidity,
  showValidation,
}: AggParamEditorProps<IpPrefix>) {

  const onPrefixLengthChange: EuiFieldNumberProps['onChange'] = useCallback(
    (e) => {
      console.log(e);
      if(e.target.dataset.testSubj === "visEditorIpPrefixPrefixLength") {
        ipPrefixObject.prefixLength = e.target.valueAsNumber;
        setValue(ipPrefixObject);
      }
    }, 
    [setValue]
  );

  const onIsIpv6Change: EuiSwitchProps['onChange'] = useCallback(
    (e) => {
      console.log(e);
      if(e.target.dataset.testSubj === "visEditorIpPrefixIsIpv6") {
        ipPrefixObject.isIpv6 = e.target.checked;
        setValue(ipPrefixObject);
      }
    },
    [setValue]
  );

  return (
    <EuiFormRow
      fullWidth={true}
      display="rowCompressed"
      label={prefixLengthLabel} 
    >
      <EuiFlexGroup gutterSize="s" responsive={false} direction={'column'}>
        <EuiFlexItem> 
          <EuiFieldNumber
            value={ipPrefixObject.prefixLength}
            onChange={onPrefixLengthChange}
            fullWidth={true}
            compressed
            onBlur={setTouched}
            min={0}
            max={128}
            data-test-subj={`visEditorIpPrefixPrefixLength`}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSwitch
            checked={ipPrefixObject.isIpv6}
            label={isIpv6Label}
            onChange={onIsIpv6Change}
            compressed
            data-test-subj={`visEditorIpPrefixIsIpv6`}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
}

export { IpPrefixParamEditor };
