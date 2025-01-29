/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ChangeEvent, useCallback } from 'react';

import {
  EuiFormRow,
  EuiFieldNumber,
  EuiFieldNumberProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiSwitchEvent,
  EuiSwitchProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AggParamEditorProps } from '../agg_param_props';
import { useValidation } from './utils';

export interface IpPrefix {
  prefixLength: number;
  isIpv6: boolean;
}

function isPrefixValid({ prefixLength, isIpv6 }: IpPrefix): boolean {
  if (prefixLength < 0) {
    return false;
  } else if (prefixLength > 32 && !isIpv6) {
    return false;
  } else if (prefixLength > 128 && isIpv6) {
    return false;
  }

  return true;
}

const prefixLengthLabel = i18n.translate('visDefaultEditor.controls.IpPrefix.prefixLength', {
  defaultMessage: 'Prefix length',
});

const isIpv6Label = i18n.translate('visDefaultEditor.controls.IpPrefix.isIpv6', {
  defaultMessage: 'Prefix applies to IPv6 addresses',
});

function IpPrefixParamEditor({
  agg,
  value = {} as IpPrefix,
  setTouched,
  setValue,
  setValidity,
  showValidation,
}: AggParamEditorProps<IpPrefix>) {
  const isValid = isPrefixValid(value);
  let error;

  if (!isValid) {
    if (!value.isIpv6) {
      error = i18n.translate('visDefaultEditor.controls.ipPrefix.errorMessageIpv4', {
        defaultMessage: 'Prefix length must be between 0 and 32 for IPv4 addresses.',
      });
    } else {
      error = i18n.translate('visDefaultEditor.controls.ipPrefix.errorMessageIpv6', {
        defaultMessage: 'Prefix length must be between 0 and 128 for IPv6 addresses.',
      });
    }
  }

  useValidation(setValidity, isValid);

  const onPrefixLengthChange: EuiFieldNumberProps['onChange'] = useCallback(
    (ev: ChangeEvent<HTMLInputElement>) => {
      setValue({ ...value, prefixLength: ev.target.valueAsNumber });
    },
    [setValue, value]
  );

  const onIsIpv6Change: EuiSwitchProps['onChange'] = useCallback(
    (ev: EuiSwitchEvent) => {
      setValue({ ...value, isIpv6: ev.target.checked });
    },
    [setValue, value]
  );

  return (
    <EuiFormRow
      fullWidth={true}
      display="rowCompressed"
      label={prefixLengthLabel}
      isInvalid={showValidation ? !isValid : false}
      error={error}
    >
      <EuiFlexGroup gutterSize="m" responsive={false} direction={'column'}>
        <EuiFlexItem>
          <EuiFieldNumber
            value={value.prefixLength}
            onChange={onPrefixLengthChange}
            fullWidth={true}
            compressed
            onBlur={setTouched}
            min={0}
            max={value.isIpv6 ? 128 : 32}
            data-test-subj={`visEditorIpPrefixPrefixLength`}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSwitch
            checked={value.isIpv6}
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
