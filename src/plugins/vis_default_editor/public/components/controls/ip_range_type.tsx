/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';

import { EuiButtonGroup, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AggParamEditorProps } from '../agg_param_props';

enum IpRangeTypes {
  MASK = 'mask',
  FROM_TO = 'fromTo',
}

function IpRangeTypeParamEditor({ agg, value, setValue }: AggParamEditorProps<IpRangeTypes>) {
  const options = [
    {
      id: `visEditorIpRangeFromToLabel${agg.id}`,
      label: i18n.translate('visDefaultEditor.controls.ipRanges.fromToButtonLabel', {
        defaultMessage: 'From/to',
      }),
    },
    {
      id: `visEditorIpRangeCidrLabel${agg.id}`,
      label: i18n.translate('visDefaultEditor.controls.ipRanges.cidrMasksButtonLabel', {
        defaultMessage: 'CIDR masks',
      }),
    },
  ];

  const onClick = (optionId: string) => {
    setValue(optionId === options[0].id ? IpRangeTypes.FROM_TO : IpRangeTypes.MASK);
  };

  return (
    <>
      <EuiSpacer size="m" />
      <EuiButtonGroup
        isFullWidth={true}
        onChange={onClick}
        idSelected={value === IpRangeTypes.FROM_TO ? options[0].id : options[1].id}
        options={options}
        legend={i18n.translate('visDefaultEditor.controls.ipRangesAriaLabel', {
          defaultMessage: 'IP ranges',
        })}
      />
      <EuiSpacer size="s" />
    </>
  );
}

export { IpRangeTypeParamEditor, IpRangeTypes };
