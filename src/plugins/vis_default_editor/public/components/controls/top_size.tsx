/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SizeParamEditor } from './size';
import { getCompatibleAggs } from './top_aggregate';
import { AggParamEditorProps } from '../agg_param_props';

function TopSizeParamEditor(props: AggParamEditorProps<number | ''>) {
  const iconTip = (
    <>
      {' '}
      <EuiIconTip
        position="right"
        content={i18n.translate('visDefaultEditor.controls.sizeTooltip', {
          defaultMessage:
            "Request top-K hits. Multiple hits will be combined via 'aggregate with'.",
        })}
        type="questionInCircle"
      />
    </>
  );
  const fieldType = props.agg.params.field && props.agg.params.field.type;
  const disabled = fieldType && !getCompatibleAggs(props.agg).length;

  return <SizeParamEditor {...props} iconTip={iconTip} disabled={disabled} />;
}

export { TopSizeParamEditor };
