/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { css } from '@emotion/react';
import {
  EuiPanel,
  EuiSwitch,
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EuiHorizontalRule,
  EuiFieldNumber,
  EuiFormRow,
  useEuiTheme,
} from '@elastic/eui';

interface DesignPanelValues {
  showControls: boolean;
  visibleControlCount: number;
}

const defaults: DesignPanelValues = {
  showControls: false,
  visibleControlCount: 10,
};

const DesignPanelContext = createContext<DesignPanelValues>(defaults);

export const useDesignPanel = () => useContext(DesignPanelContext);

export const DesignPanel: React.FC<{
  children: React.ReactNode;
  onGenerateControls?: (count: number) => void;
}> = ({ children, onGenerateControls }) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [values, setValues] = useState<DesignPanelValues>(defaults);
  const [generateCount, setGenerateCount] = useState(5);

  const setVisibleCount = useCallback((count: number) => {
    setValues((prev) => ({ ...prev, visibleControlCount: Math.max(1, Math.min(10, count)) }));
  }, []);

  return (
    <DesignPanelContext.Provider value={values}>
      {children}
      <div
        css={css`
          position: fixed;
          bottom: ${euiTheme.size.base};
          right: ${euiTheme.size.base};
          z-index: 10000;
        `}
      >
        {!isOpen && (
          <EuiButtonIcon
            iconType="wrench"
            aria-label="Open design panel"
            display="fill"
            size="m"
            onClick={() => setIsOpen(true)}
            css={css`
              border-radius: 50%;
              box-shadow: ${euiTheme.levels.toast};
            `}
          />
        )}
        {isOpen && (
          <EuiPanel
            paddingSize="m"
            hasShadow
            css={css`
              width: 260px;
            `}
          >
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxxs">
                  <h4>Design Panel</h4>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="cross"
                  aria-label="Close design panel"
                  size="xs"
                  onClick={() => setIsOpen(false)}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            {onGenerateControls && (
              <>
                <EuiHorizontalRule margin="s" />
                <EuiSwitch
                  label="Show controls"
                  checked={values.showControls}
                  onChange={() =>
                    setValues((prev) => ({ ...prev, showControls: !prev.showControls }))
                  }
                  compressed
                />
                {values.showControls && (
                  <>
                    <EuiSpacer size="s" />
                    <EuiFormRow label="Visible controls" fullWidth>
                      <EuiFieldNumber
                        min={1}
                        max={10}
                        value={values.visibleControlCount}
                        onChange={(e) => setVisibleCount(Number(e.target.value))}
                        compressed
                        fullWidth
                      />
                    </EuiFormRow>
                  </>
                )}
                <EuiSpacer size="s" />
                <EuiFormRow label="Controls to generate" fullWidth>
                  <EuiFieldNumber
                    min={1}
                    max={10}
                    value={generateCount}
                    onChange={(e) =>
                      setGenerateCount(Math.max(1, Math.min(10, Number(e.target.value))))
                    }
                    compressed
                    fullWidth
                  />
                </EuiFormRow>
                <EuiSpacer size="s" />
                <EuiButton
                  size="s"
                  fullWidth
                  onClick={() => {
                    setValues((prev) => ({ ...prev, showControls: true }));
                    onGenerateControls(generateCount);
                  }}
                >
                  Generate controls
                </EuiButton>
              </>
            )}
          </EuiPanel>
        )}
      </div>
    </DesignPanelContext.Provider>
  );
};
