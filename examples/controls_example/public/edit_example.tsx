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
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { ControlGroupRenderer, ControlGroupAPI } from '@kbn/controls-plugin/public';

const INPUT_KEY = 'kbnControls:saveExample:input';

export const EditExample = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [controlGroup, setControlGroup] = useState<ControlGroupAPI | null>();

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
        </EuiFlexGroup>
        {isLoading ? (
          <>
            <EuiSpacer />
            <EuiLoadingContent lines={1} />
          </>
        ) : null}
        <ControlGroupRenderer
          ref={setControlGroup}
          getInitialInput={async (initialInput, builder) => {
            const persistedInput = await onLoad();
            return {
              ...initialInput,
              ...persistedInput,
              viewMode: ViewMode.EDIT,
            };
          }}
        />
      </EuiPanel>
    </>
  );
};
