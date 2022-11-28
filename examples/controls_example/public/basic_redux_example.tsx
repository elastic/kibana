/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';

import {
  LazyControlGroupRenderer,
  ControlGroupContainer,
  ControlGroupInput,
  ControlStyle,
} from '@kbn/controls-plugin/public';
import { withSuspense } from '@kbn/presentation-util-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { getDefaultControlGroupInput } from '@kbn/controls-plugin/common';

interface Props {
  dataView: DataView;
}
const ControlGroupRenderer = withSuspense(LazyControlGroupRenderer);

export const BasicReduxExample = ({ dataView }: Props) => {
  const [controlStyle, setControlStyle] = useState<ControlStyle>('oneLine');

  return (
    <>
      <EuiTitle>
        <h2>Basic Redux Example</h2>
      </EuiTitle>
      <EuiText>
        <p>
          This example uses the redux context from the control group container in order to
          dynamically change the style of the control group.
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder={true}>
        <>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText>
                <p>Choose a style for your control group:</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
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
                idSelected={controlStyle}
                onChange={(id, value) => {
                  setControlStyle(value);
                }}
                type="single"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </>

        <ControlGroupRenderer
          controlStyle={controlStyle}
          getCreationOptions={async (controlGroupInputBuilder) => {
            const initialInput: Partial<ControlGroupInput> = {
              ...getDefaultControlGroupInput(),
              defaultControlWidth: 'small',
            };
            await controlGroupInputBuilder.addDataControlFromField(initialInput, {
              dataViewId: dataView.id ?? 'kibana_sample_data_ecommerce',
              fieldName: 'customer_first_name.keyword',
            });
            await controlGroupInputBuilder.addDataControlFromField(initialInput, {
              dataViewId: dataView.id ?? 'kibana_sample_data_ecommerce',
              fieldName: 'customer_last_name.keyword',
              width: 'medium',
              grow: false,
              title: 'Last Name',
            });
            return initialInput;
          }}
        />
      </EuiPanel>
    </>
  );
};
