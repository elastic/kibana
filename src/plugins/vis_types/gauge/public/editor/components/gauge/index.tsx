/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { EuiSpacer } from '@elastic/eui';

import { VisEditorOptionsProps } from 'src/plugins/visualizations/public';
import { GaugeTypeProps, GaugeVisParams } from '../../../types';
import { RangesPanel } from './ranges_panel';
import { StylePanel } from './style_panel';
import { LabelsPanel } from './labels_panel';

export interface GaugeOptionsProps extends VisEditorOptionsProps<GaugeVisParams>, GaugeTypeProps {}

export type GaugeOptionsInternalProps = GaugeOptionsProps & {
  setGaugeValue: <T extends keyof GaugeVisParams['gauge']>(
    paramName: T,
    value: GaugeVisParams['gauge'][T]
  ) => void;
};

function GaugeOptions(props: GaugeOptionsProps) {
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

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { GaugeOptions as default };
