/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useCallback } from 'react';
import { EuiPanel } from '@elastic/eui';

import { VisOptionsProps } from 'src/plugins/vis_default_editor/public';
import { KibanaContextProvider } from '../../kibana_react/public';

import { TimelionVisParams } from './timelion_vis_fn';
import { TimelionInterval, TimelionExpressionInput } from './components';
import { TimelionVisDependencies } from './plugin';

import './timelion_options.scss';

export type TimelionOptionsProps = VisOptionsProps<TimelionVisParams>;

function TimelionOptions({
  services,
  stateParams,
  setValue,
  setValidity,
}: TimelionOptionsProps & {
  services: TimelionVisDependencies;
}) {
  const setInterval = useCallback(
    (value: TimelionVisParams['interval']) => setValue('interval', value),
    [setValue]
  );
  const setExpressionInput = useCallback(
    (value: TimelionVisParams['expression']) => setValue('expression', value),
    [setValue]
  );

  return (
    <KibanaContextProvider services={services}>
      <EuiPanel className="visEditorSidebar__timelionOptions" paddingSize="s">
        <TimelionInterval
          value={stateParams.interval}
          setValue={setInterval}
          setValidity={setValidity}
        />
        <TimelionExpressionInput value={stateParams.expression} setValue={setExpressionInput} />
      </EuiPanel>
    </KibanaContextProvider>
  );
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { TimelionOptions as default };
