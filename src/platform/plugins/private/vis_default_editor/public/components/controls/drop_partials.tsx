/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { SwitchParamEditor } from './switch';
import { AggParamEditorProps } from '../agg_param_props';

function DropPartialsParamEditor(props: AggParamEditorProps<boolean>) {
  return (
    <SwitchParamEditor
      dataTestSubj="dropPartialBucketsCheckbox"
      displayLabel={i18n.translate('visDefaultEditor.controls.dropPartialBucketsLabel', {
        defaultMessage: 'Drop partial buckets',
      })}
      displayToolTip={i18n.translate('visDefaultEditor.controls.dropPartialBucketsTooltip', {
        defaultMessage:
          "Remove buckets that span time outside the time range so the histogram doesn't start and end with incomplete buckets.",
      })}
      {...props}
    />
  );
}

export { DropPartialsParamEditor };
