/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';

import { EuiRange, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AggParamEditorProps } from 'ui/vis/editors/default';

function PrecisionParamEditor({ agg, config, value, setValue }: AggParamEditorProps<number>) {
  if (agg.params.autoPrecision) {
    return null;
  }

  const label = i18n.translate('common.ui.aggTypes.precisionLabel', {
    defaultMessage: 'Precision',
  });

  return (
    <EuiFormRow label={label} className="visEditorSidebar__aggParamFormRow">
      <EuiRange
        min={1}
        max={config.get('visualization:tileMap:maxPrecision')}
        value={value}
        onChange={ev => setValue(Number(ev.target.value))}
        data-test-subj={`visEditorMapPrecision${agg.id}`}
        showValue
      />
    </EuiFormRow>
  );
}

export { PrecisionParamEditor };
