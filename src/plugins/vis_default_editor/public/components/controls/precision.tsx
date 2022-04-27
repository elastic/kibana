/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiRange, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IUiSettingsClient } from '@kbn/core/public';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AggParamEditorProps } from '../agg_param_props';

function PrecisionParamEditor({ agg, value, setValue }: AggParamEditorProps<number>) {
  const { services } = useKibana<{ uiSettings: IUiSettingsClient }>();
  const label = i18n.translate('visDefaultEditor.controls.precisionLabel', {
    defaultMessage: 'Precision',
  });

  if (agg.params.autoPrecision) {
    return null;
  }

  return (
    <EuiFormRow label={label} display="rowCompressed">
      <EuiRange
        min={1}
        max={services.uiSettings.get('visualization:tileMap:maxPrecision')}
        value={value || ''}
        onChange={(ev: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLButtonElement>) =>
          setValue(Number(ev.currentTarget.value))
        }
        data-test-subj={`visEditorMapPrecision${agg.id}`}
        showValue
        compressed
      />
    </EuiFormRow>
  );
}

export { PrecisionParamEditor };
