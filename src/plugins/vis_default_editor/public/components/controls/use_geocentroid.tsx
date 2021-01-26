/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { EuiSwitch, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AggParamEditorProps } from '../agg_param_props';

function UseGeocentroidParamEditor({ value = false, setValue }: AggParamEditorProps<boolean>) {
  const label = i18n.translate('visDefaultEditor.controls.placeMarkersOffGridLabel', {
    defaultMessage: 'Place markers off grid (use geocentroid)',
  });

  return (
    <EuiFormRow display="rowCompressed">
      <EuiSwitch
        compressed={true}
        label={label}
        checked={value}
        onChange={(ev) => setValue(ev.target.checked)}
      />
    </EuiFormRow>
  );
}

export { UseGeocentroidParamEditor };
