/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { SwitchParamEditor } from '../switch';
import { AggParamEditorProps } from '../../agg_param_props';

function IsIpv6Object(props: AggParamEditorProps<boolean>) {
  return (
    <SwitchParamEditor
      dataTestSubj="isIpv6Switch"
      displayLabel={i18n.translate('visDefaultEditor.controls.IpPrefix.isIpv6Label', {
        defaultMessage: 'Prefix applies to IPv6 addresses',
      })}
      {...props}
    />
  );
}

export { IsIpv6Object };
