/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pickBy } from 'lodash';
import React, { useEffect, useState } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonRectangle,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import {
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  type ControlGroupRuntimeState,
} from '@kbn/controls-plugin/common';
import {
  ACTION_DELETE_CONTROL,
  ACTION_EDIT_CONTROL,
  ControlGroupRenderer,
  ControlGroupRendererApi,
  type ControlStateTransform,
} from '@kbn/controls-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';

const INPUT_KEY = 'kbnControls:saveExample:input';

const WITH_CUSTOM_PLACEHOLDER = 'Custom Placeholder';

type StoredState = ControlGroupRuntimeState & { disabledActions: string[] };

export const EditExample = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [controlGroupAPI, setControlGroupAPI] = useState<ControlGroupRendererApi | undefined>();
  const [toggleIconIdToSelectedMapIcon, setToggleIconIdToSelectedMapIcon] = useState<{
    [id: string]: boolean;
  }>({});

  useEffect(() => {
    if (controlGroupAPI) {
      const disabledActions: string[] = Object.keys(
        pickBy(
          toggleIconIdToSelectedMapIcon,
          (value, key) => value && key !== WITH_CUSTOM_PLACEHOLDER
        )
      );
      controlGroupAPI.setDisabledActionIds(disabledActions);
    }
  }, [controlGroupAPI, toggleIconIdToSelectedMapIcon]);

  async function onSave() {
    if (!controlGroupAPI) return;

    setIsSaving(true);
    localStorage.setItem(
      INPUT_KEY,
      JSON.stringify({
        ...controlGroupAPI.snapshotRuntimeState(),
        disabledActions: controlGroupAPI.disabledActionIds.getValue(), // not part of runtime
      })
    );

    // simulated async save await
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsSaving(false);
  }

  async function onLoad() {
    setIsLoading(true);

    // simulated async load await
    await new Promise((resolve) => setTimeout(resolve, 6000));

    let state: Partial<StoredState> = {};
    let disabledActions = [];
    const inputAsString = localStorage.getItem(INPUT_KEY);
    if (inputAsString) {
      try {
        ({ disabledActions, ...state } = JSON.parse(inputAsString));
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
    return state;
  }

  const controlStateTransform: ControlStateTransform = (newState, type) => {
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
                if (!controlGroupAPI) return;
                controlGroupAPI.openAddDataControlFlyout({ controlStateTransform });
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
              onChange={(optionId: string) => {
                const newToggleIconIdToSelectedMapIcon = {
                  ...toggleIconIdToSelectedMapIcon,
                  ...{
                    [optionId]: !toggleIconIdToSelectedMapIcon[optionId],
                  },
                };
                setToggleIconIdToSelectedMapIcon(newToggleIconIdToSelectedMapIcon);
              }}
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
            <EuiSkeletonRectangle width="100%" height="2em" />
          </>
        ) : null}
        <ControlGroupRenderer
          onApiAvailable={setControlGroupAPI}
          getCreationOptions={async (initialState, builder) => {
            const persistedState = await onLoad();
            return {
              initialState: {
                ...initialState,
                ...persistedState,
              },
            };
          }}
          viewMode={ViewMode.EDIT}
        />
      </EuiPanel>
    </>
  );
};
