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

function OtherBucketParamEditor(props: AggParamEditorProps<boolean>) {
  return (
    <SwitchParamEditor
      dataTestSubj="otherBucketSwitch"
      displayLabel={i18n.translate('visDefaultEditor.controls.otherBucket.groupValuesLabel', {
        defaultMessage: 'Group other values in separate bucket',
      })}
      displayToolTip={i18n.translate('visDefaultEditor.controls.otherBucket.groupValuesTooltip', {
        defaultMessage:
          'Values not in the top N are grouped in this bucket. ' +
          "To include documents with missing values, enable 'Show missing values'.",
      })}
      {...props}
    />
  );
}

export { OtherBucketParamEditor };
