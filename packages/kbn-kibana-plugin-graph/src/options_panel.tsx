/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonIcon,
  EuiCheckbox,
  EuiCode,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';

interface Props {
  cytoscapeOptions: any;
  containerHeight: number | undefined;
  onSetCytoscapeOptions: any;
}

export function OptionsPanel({
  cytoscapeOptions,
  containerHeight,

  onSetCytoscapeOptions,
}: Props) {
  const [optionsPanelOpen, setOptionsPanelOpen] = useState(false);

  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 2,
        bottom: 20,
        maxHeight: containerHeight ? containerHeight : 'auto',
      }}
    >
      {optionsPanelOpen ? (
        <EuiPanel
          style={{
            width: 300,
            minHeight: 0,
            overflow: 'scroll',
            maxHeight: containerHeight ? containerHeight : 'auto',
          }}
        >
          <EuiButtonIcon
            aria-label="Close options panel"
            style={{ position: 'absolute', right: 10 }}
            iconType="cross"
            onClick={() => setOptionsPanelOpen(!optionsPanelOpen)}
          />

          <EuiAccordion
            id="options"
            buttonContent={
              <EuiTitle size="xs">
                <h3>Options</h3>
              </EuiTitle>
            }
            initialIsOpen
            paddingSize="l"
          >
            <EuiFlexGroup direction="column">
              {Object.keys(cytoscapeOptions).map((option) => (
                <EuiFlexItem key={option}>
                  <EuiFlexGroup direction="row" alignItems="center">
                    <EuiFlexItem>
                      {typeof cytoscapeOptions[option] === 'number' ||
                      typeof cytoscapeOptions[option] === 'string' ||
                      typeof cytoscapeOptions[option] === 'boolean' ? (
                        <EuiCode>{option}</EuiCode>
                      ) : null}
                    </EuiFlexItem>
                    <EuiFlexItem>
                      {typeof cytoscapeOptions[option] === 'number' ? (
                        <EuiFieldNumber
                          value={String(cytoscapeOptions[option])}
                          onChange={(e) => {
                            onSetCytoscapeOptions({
                              ...cytoscapeOptions,
                              [option]: Number(e.currentTarget.value),
                            });
                          }}
                        />
                      ) : null}

                      {typeof cytoscapeOptions[option] === 'string' ? (
                        <EuiFieldText
                          value={String(cytoscapeOptions[option])}
                          onChange={(e) => {
                            onSetCytoscapeOptions({
                              ...cytoscapeOptions,
                              [option]: e.currentTarget.value,
                            });
                          }}
                        />
                      ) : null}

                      {typeof cytoscapeOptions[option] === 'boolean' ? (
                        <EuiCheckbox
                          id={`check-${option}`}
                          checked={cytoscapeOptions[option]}
                          onChange={(e) => {
                            onSetCytoscapeOptions({
                              ...cytoscapeOptions,
                              [option]: e.currentTarget.checked,
                            });
                          }}
                        />
                      ) : null}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiAccordion>
        </EuiPanel>
      ) : (
        <EuiButton onClick={() => setOptionsPanelOpen(true)}>
          <EuiIcon type="advancedSettingsApp" />
        </EuiButton>
      )}
    </div>
  );
}
