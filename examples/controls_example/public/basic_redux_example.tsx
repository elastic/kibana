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
  useControlGroupContainerContext,
  ControlStyle,
} from '@kbn/controls-plugin/public';
import { withSuspense } from '@kbn/presentation-util-plugin/public';
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

const ControlGroupRenderer = withSuspense(LazyControlGroupRenderer);

export const BasicReduxExample = ({ dataViewId }: { dataViewId: string }) => {
  const [controlGroup, setControlGroup] = useState<ControlGroupContainer>();

  const ControlGroupReduxWrapper = useMemo(() => {
    if (controlGroup) return controlGroup.getReduxEmbeddableTools().Wrapper;
  }, [controlGroup]);

  const ButtonControls = () => {
    const {
      useEmbeddableDispatch,
      useEmbeddableSelector: select,
      actions: { setControlStyle },
    } = useControlGroupContainerContext();
    const dispatch = useEmbeddableDispatch();
    const controlStyle = select((state) => state.explicitInput.controlStyle);

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
              idSelected={controlStyle}
              onChange={(id, value) => {
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
          onLoadComplete={async (newControlGroup) => {
            setControlGroup(newControlGroup);
          }}
          getInitialInput={async (initialInput, builder) => {
            await builder.addDataControlFromField(initialInput, {
              dataViewId,
              fieldName: 'customer_first_name.keyword',
              width: 'small',
            });
            await builder.addDataControlFromField(initialInput, {
              dataViewId,
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
