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
  EuiFieldText,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';

interface SettingsFlyoutProps {
  title: string;

  defaultIndex: string;
  updateIndex: (idx: string) => void;

  defaultProjectID: number;
  updateProjectID: (n: number) => void;

  defaultN: number;
  updateN: (n: number) => void;
}

export function SettingsFlyout({
  title,
  defaultIndex,
  updateIndex,
  defaultProjectID,
  updateProjectID,
  defaultN,
  updateN,
}: SettingsFlyoutProps) {
  const [index, setIndex] = useState(defaultIndex);
  const [projectID, setProjectID] = useState(defaultProjectID);
  const [n, setN] = useState(defaultN);

  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'settings',
  });

  const showFlyout = () => setIsFlyoutVisible(true);

  const closeFlyout = () => setIsFlyoutVisible(false);

  const saveFlyout = () => {
    updateIndex(index);
    updateProjectID(projectID);
    updateN(n);
    setIsFlyoutVisible(false);
  };

  const onIndexChange = (e: any) => setIndex(e.target.value);
  const onProjectIDChange = (e: any) => setProjectID(e.target.value);
  const onNChange = (e: any) => setN(e.target.value);

  return (
    <div>
      <EuiButton onClick={showFlyout}>{title}</EuiButton>
      {isFlyoutVisible && (
        <EuiFlyout ownFocus onClose={closeFlyout} hideCloseButton aria-labelledby={flyoutTitleId}>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>{title}</h2>
            </EuiTitle>
            <EuiSpacer size="s" />
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiForm component="form">
              <EuiFormRow
                label="Index"
                helpText="This is the primary Elasticsearch index used before sampling."
              >
                <EuiFieldText name="index" value={index} onChange={onIndexChange} />
              </EuiFormRow>
              <EuiFormRow
                label="Project ID"
                helpText="This is the project ID as defined by the host agent."
              >
                <EuiFieldText name="projectID" value={projectID} onChange={onProjectIDChange} />
              </EuiFormRow>
              <EuiFormRow
                label="N"
                helpText="This is the maximum number of items per histogram bucket (Stack Traces) or is currently ignored (FlameGraph)."
              >
                <EuiFieldText name="n" value={n} onChange={onNChange} />
              </EuiFormRow>
            </EuiForm>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
                  Close
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton onClick={saveFlyout} fill>
                  Save
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </div>
  );
}
