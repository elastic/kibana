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

import React, { useCallback } from 'react';
import { EuiSpacer } from '@elastic/eui';

import { VisOptionsProps } from 'ui/vis/editors/default';
import { GaugeVisParams } from '../../../gauge';
import { RangesPanel } from './ranges_panel';
import { StylePanel } from './style_panel';
import { LabelsPanel } from './labels_panel';

export type GaugeOptionsInternalProps = VisOptionsProps<GaugeVisParams> & {
  setGaugeValue: <T extends keyof GaugeVisParams['gauge']>(
    paramName: T,
    value: GaugeVisParams['gauge'][T]
  ) => void;
};

function GaugeOptions(props: VisOptionsProps<GaugeVisParams>) {
  const { stateParams, setValue } = props;

  const setGaugeValue: GaugeOptionsInternalProps['setGaugeValue'] = useCallback(
    (paramName, value) =>
      setValue('gauge', {
        ...stateParams.gauge,
        [paramName]: value,
      }),
    [setValue, stateParams.gauge]
  );

  return (
    <>
      <StylePanel {...props} setGaugeValue={setGaugeValue} />

      <EuiSpacer size="s" />

      <RangesPanel {...props} setGaugeValue={setGaugeValue} />

      <EuiSpacer size="s" />

      <LabelsPanel {...props} setGaugeValue={setGaugeValue} />
    </>
  );
}

export { GaugeOptions };
