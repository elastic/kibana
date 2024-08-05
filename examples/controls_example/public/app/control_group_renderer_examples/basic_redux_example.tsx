/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';

import { EuiButtonGroup, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { DEFAULT_CONTROL_STYLE } from '@kbn/controls-plugin/common';
import { ControlStyle } from '@kbn/controls-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import {
  AwaitingControlGroupAPI,
  ControlGroupRenderer,
} from '../../react_controls/control_group/external_api';
import { ControlGroupApi } from '../../react_controls/control_group/types';

export const BasicReduxExample = ({ dataViewId }: { dataViewId: string }) => {
  const [controlGroupAPI, setControlGroupApi] = useState<AwaitingControlGroupAPI>(null);
  const [selectedLabelPostion, setSelectedLabelPosition] =
    useState<ControlStyle>(DEFAULT_CONTROL_STYLE);

  const Buttons = ({ api }: { api: ControlGroupApi }) => {
    return (
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
        idSelected={selectedLabelPostion}
        onChange={(id, value) => setSelectedLabelPosition(value)}
        type="single"
      />
    );
  };

  /** TODO: THIS EXAMPLE IS BROKEN - DO WE NEED TO FIX IT? */
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
        {controlGroupAPI && <Buttons api={controlGroupAPI} />}

        <ControlGroupRenderer
          ref={setControlGroupApi}
          getCreationOptions={async (initialInput, builder) => {
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
              initialInput: {
                ...initialInput,
                viewMode: ViewMode.VIEW,
              },
            };
          }}
        />
      </EuiPanel>
    </>
  );
};
