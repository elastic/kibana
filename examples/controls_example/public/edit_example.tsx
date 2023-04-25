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
import { OPTIONS_LIST_CONTROL, RANGE_SLIDER_CONTROL } from '@kbn/controls-plugin/common';
import {
  type ControlGroupInput,
  ControlGroupRenderer,
  AwaitingControlGroupAPI,
  ACTION_EDIT_CONTROL,
  ACTION_DELETE_CONTROL,
} from '@kbn/controls-plugin/public';
import { ControlInputTransform } from '@kbn/controls-plugin/common/types';

const INPUT_KEY = 'kbnControls:saveExample:input';

const WITH_CUSTOM_PLACEHOLDER = 'Custom Placeholder';

export const EditExample = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [controlGroupAPI, setControlGroupAPI] = useState<AwaitingControlGroupAPI>(null);
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

    if (controlGroupAPI) {
      const disabledActions: string[] = Object.keys(
        pickBy(newToggleIconIdToSelectedMapIcon, (value) => value)
      );
      controlGroupAPI.updateInput({ disabledActions });
    }

    setToggleIconIdToSelectedMapIcon(newToggleIconIdToSelectedMapIcon);
  }

  async function onSave() {
    if (!controlGroupAPI) return;

    setIsSaving(true);
    localStorage.setItem(INPUT_KEY, JSON.stringify(controlGroupAPI.getInput()));

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
          [WITH_CUSTOM_PLACEHOLDER]: false,
        });
      } catch (e) {
        // ignore parse errors
      }
    }
    setIsLoading(false);
    return input;
  }

  const controlInputTransform: ControlInputTransform = (newState, type) => {
    if (type === OPTIONS_LIST_CONTROL && toggleIconIdToSelectedMapIcon[WITH_CUSTOM_PLACEHOLDER]) {
      return {
        ...newState,
        placeholder: 'Custom Placeholder',
      };
    }

    if (type === RANGE_SLIDER_CONTROL) {
      return {
        ...newState,
        value: ['0', '4'],
      };
    }

    return newState;
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
        <EuiFlexGroup gutterSize="m" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              color="primary"
              iconType="plusInCircle"
              isDisabled={controlGroupAPI === undefined}
              onClick={() => {
                controlGroupAPI!.openAddDataControlFlyout({ controlInputTransform });
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
                {
                  id: WITH_CUSTOM_PLACEHOLDER,
                  label: WITH_CUSTOM_PLACEHOLDER,
                  value: WITH_CUSTOM_PLACEHOLDER,
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
              isDisabled={controlGroupAPI === undefined || isSaving}
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
          ref={setControlGroupAPI}
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
        />
      </EuiPanel>
    </>
  );
};
