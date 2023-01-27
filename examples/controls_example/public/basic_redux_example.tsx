/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';

import { ViewMode } from '@kbn/embeddable-plugin/public';
import { EuiButtonGroup, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { ControlGroupRenderer, ControlStyle, ControlGroupAPI } from '@kbn/controls-plugin/public';

export const BasicReduxExample = ({ dataViewId }: { dataViewId: string }) => {
  const [controlGroupAPI, setControlGroupApi] = useState<ControlGroupAPI | null>();

  const controlStyle = controlGroupAPI?.select((state) => state.explicitInput.controlStyle);

  return (
    <>
      <EuiTitle>
        <h2>Redux example</h2>
      </EuiTitle>
      <EuiText>
        <p>Use the redux context from the control group to set layout style.</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder={true}>
        {controlGroupAPI && (
          <EuiButtonGroup
            legend="Text style"
            options={[
              {
                id: `oneLine`,
                label: 'One line',
                value: 'oneLine' as ControlStyle,
              },
              {
                id: `twoLine`,
                label: 'Two lines',
                value: 'twoLine' as ControlStyle,
              },
            ]}
            idSelected={controlStyle ?? 'oneLine'}
            onChange={(id, value) => controlGroupAPI?.dispatch.setControlStyle(value)}
            type="single"
          />
        )}

        <ControlGroupRenderer
          ref={setControlGroupApi}
          getInitialInput={async (initialInput, builder) => {
            await builder.addDataControlFromField(initialInput, {
              dataViewId,
              title: 'Destintion country',
              fieldName: 'geo.dest',
              width: 'medium',
              grow: false,
            });
            await builder.addDataControlFromField(initialInput, {
              dataViewId,
              fieldName: 'bytes',
              width: 'medium',
              grow: true,
              title: 'Bytes',
            });
            return {
              ...initialInput,
              viewMode: ViewMode.VIEW,
            };
          }}
        />
      </EuiPanel>
    </>
  );
};
