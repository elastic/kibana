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
  useControlGroupContainerContext,
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
  const [myControlGroup, setControlGroup] = useState<ControlGroupContainer>();
  const [currentControlStyle, setCurrentControlStyle] = useState<ControlStyle>('oneLine');

  const ControlGroupReduxWrapper = useMemo(() => {
    if (myControlGroup) return myControlGroup.getReduxEmbeddableTools().Wrapper;
  }, [myControlGroup]);

  const ButtonControls = () => {
    const {
      useEmbeddableDispatch,
      actions: { setControlStyle },
    } = useControlGroupContainerContext();
    const dispatch = useEmbeddableDispatch();

    return (
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
              idSelected={currentControlStyle}
              onChange={(id, value) => {
                setCurrentControlStyle(value);
                dispatch(setControlStyle(value));
              }}
              type="single"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
      </>
    );
  };

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
        {ControlGroupReduxWrapper && (
          <ControlGroupReduxWrapper>
            <ButtonControls />
          </ControlGroupReduxWrapper>
        )}

        <ControlGroupRenderer
          onEmbeddableLoad={async (controlGroup) => {
            setControlGroup(controlGroup);
          }}
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
