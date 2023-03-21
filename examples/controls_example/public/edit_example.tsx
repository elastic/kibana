/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pickBy } from 'lodash';
import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
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
import { ACTION_EDIT_CONTROL, ACTION_DELETE_CONTROL } from '@kbn/controls-plugin/public';

const ControlGroupRenderer = withSuspense(LazyControlGroupRenderer);

const INPUT_KEY = 'kbnControls:saveExample:input';

export const EditExample = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [controlGroup, setControlGroup] = useState<ControlGroupContainer>();
  const [toggleIconIdToSelectedMapIcon, setToggleIconIdToSelectedMapIcon] = useState<{
    [id: string]: boolean;
  }>({});

  function onChangeIconsMultiIcons(optionId: string) {
    const newToggleIconIdToSelectedMapIcon = {
      ...toggleIconIdToSelectedMapIcon,
      ...{
        [optionId]: !toggleIconIdToSelectedMapIcon[optionId],
      },
    };

    if (controlGroup) {
      const disabledActions: string[] = Object.keys(
        pickBy(newToggleIconIdToSelectedMapIcon, (value) => value)
      );
      controlGroup.updateInput({ disabledActions });
    }

    setToggleIconIdToSelectedMapIcon(newToggleIconIdToSelectedMapIcon);
  }

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

    let input: Partial<ControlGroupInput> = {};
    const inputAsString = localStorage.getItem(INPUT_KEY);
    if (inputAsString) {
      try {
        input = JSON.parse(inputAsString);
        const disabledActions = input.disabledActions ?? [];
        setToggleIconIdToSelectedMapIcon({
          [ACTION_EDIT_CONTROL]: disabledActions.includes(ACTION_EDIT_CONTROL),
          [ACTION_DELETE_CONTROL]: disabledActions.includes(ACTION_DELETE_CONTROL),
        });
      } catch (e) {
        // ignore parse errors
      }
    }
    setIsLoading(false);
    return input;
  }

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
        <EuiFlexGroup gutterSize="m" alignItems="center">
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
          <EuiFlexItem grow={true}>
            <EuiButtonGroup
              legend="Text style"
              buttonSize="m"
              options={[
                {
                  id: ACTION_EDIT_CONTROL,
                  label: 'Disable edit action',
                  value: ACTION_EDIT_CONTROL,
                },
                {
                  id: ACTION_DELETE_CONTROL,
                  label: 'Disable delete action',
                  value: ACTION_DELETE_CONTROL,
                },
              ]}
              idToSelectedMap={toggleIconIdToSelectedMapIcon}
              type="multi"
              onChange={(id: string) => onChangeIconsMultiIcons(id)}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              color="primary"
              isDisabled={controlGroup === undefined || isSaving}
              onClick={onSave}
              isLoading={isSaving}
            >
              Save
            </EuiButton>
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
