/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import {
  LazyControlGroupRenderer,
  ControlGroupContainer,
  ControlGroupInput,
} from '@kbn/controls-plugin/public';
import { withSuspense } from '@kbn/presentation-util-plugin/public';
import styled from '@emotion/react';

const ControlGroupRenderer = withSuspense(LazyControlGroupRenderer);

const INPUT_KEY = 'kbnControls:saveExample:input';

const disabledActionOptions = [
  {
    label: 'edit',
  },
  {
    label: 'remove',
  },
  {
    label: 'all',
  },
  {
    label: 'none',
  },
];

// @ts-expect-error update types
const CustomCombobox = styled(EuiComboBox)`
  .euiFormControlLayout__prepend {
    width: 127px;
  }
`;

export const EditExample = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOptions, setSelected] = useState([disabledActionOptions[3]]);
  const [controlGroup, setControlGroup] = useState<ControlGroupContainer>();

  async function onSave() {
    setIsSaving(true);

    localStorage.setItem(INPUT_KEY, JSON.stringify(controlGroup!.getInput()));

    // simulated async save await
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsSaving(false);
  }

  async function onLoad() {
    setIsLoading(true);

    // simulated async load await
    await new Promise((resolve) => setTimeout(resolve, 1000));

    let input = {};
    const inputAsString = localStorage.getItem(INPUT_KEY);
    if (inputAsString) {
      try {
        input = JSON.parse(inputAsString);
      } catch (e) {
        // ignore parse errors
      }
    }

    setIsLoading(false);
    return input;
  }

  const disableControl = (option?: 'edit' | 'remove' | 'all') => {
    controlGroup?.updateInput({
      disabledFloatingActions: option,
    });
  };

  const onOptionsListChange = (selectedNewOpts: EuiComboBoxOptionOption[]) => {
    setSelected(selectedNewOpts);

    const newLabel = selectedNewOpts[0].label;
    const newOption =
      newLabel === 'none' ? undefined : (newLabel as ControlGroupInput['disabledFloatingActions']);

    disableControl(newOption);
  };

  return (
    <>
      <EuiTitle>
        <h2>Edit and save example</h2>
      </EuiTitle>
      <EuiText>
        <p>Customize controls and persist state to local storage.</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder={true}>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              color="primary"
              iconType="plusInCircle"
              isDisabled={controlGroup === undefined}
              onClick={() => {
                controlGroup!.openAddDataControlFlyout();
              }}
            >
              Add control
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              color="primary"
              isDisabled={controlGroup === undefined || isSaving}
              fill
              onClick={onSave}
              isLoading={isSaving}
            >
              Save
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <CustomCombobox
              prepend={'Disabled Actions'}
              aria-label="Accessible screen reader label"
              placeholder="Select a single option"
              singleSelection={{ asPlainText: true }}
              options={disabledActionOptions}
              selectedOptions={selectedOptions}
              onChange={onOptionsListChange}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        {isLoading ? (
          <>
            <EuiSpacer />
            <EuiLoadingContent lines={1} />
          </>
        ) : null}
        <ControlGroupRenderer
          getCreationOptions={async (initialInput, builder) => {
            const persistedInput = await onLoad();
            return {
              initialInput: {
                ...initialInput,
                ...persistedInput,
                viewMode: ViewMode.EDIT,
              },
            };
          }}
          onLoadComplete={async (newControlGroup) => {
            setControlGroup(newControlGroup);
          }}
        />
      </EuiPanel>
    </>
  );
};
