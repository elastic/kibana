/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { SwitchParamEditor } from './switch';
import { AggParamEditorProps } from '../agg_param_props';

function ScaleMetricsParamEditor(props: AggParamEditorProps<boolean>) {
  return (
    <SwitchParamEditor
      dataTestSubj="scaleMetricsSwitch"
      displayLabel={i18n.translate('visDefaultEditor.controls.scaleMetricsLabel', {
        defaultMessage: 'Scale metric values (deprecated)',
      })}
      displayToolTip={i18n.translate('visDefaultEditor.controls.scaleMetricsTooltip', {
        defaultMessage:
          'If you select a manual minimum interval and a larger interval will be used, enabling this will ' +
          'cause count and sum metrics to be scaled to the manual selected interval.',
      })}
      {...props}
    />
  );
}

export { ScaleMetricsParamEditor };
