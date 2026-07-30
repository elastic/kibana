/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormControlButton,
  EuiFormControlLayout,
  EuiNotificationBadge,
  euiFontSizeFromScale,
  useEuiTheme,
} from '@elastic/eui';
import { DataSourceBrowser, DataSourceSelectionChange } from '@kbn/esql-resource-browser';

const shrinkableContainerCss = css`
  min-width: 0;
  flex-direction: row;
`;

const triggerBaseCss = css`
  box-shadow: none;
  &:focus,
  &:focus-within,
  &:hover,
  &:active {
    box-shadow: none !important;
    outline: none !important;
  }
`;

interface VisorDataSourcePickerProps {
  currentSources: string[];
  isTimeseries: boolean;
  onChangeSources: (newSources: string[]) => void;
  isDisabled?: boolean;
}

export function VisorDataSourcePicker({
  currentSources,
  isTimeseries,
  onChangeSources,
  isDisabled,
}: VisorDataSourcePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const { euiTheme } = useEuiTheme();

  const triggerCss = useMemo(
    () => [
      triggerBaseCss,
      css`
        font-size: ${euiFontSizeFromScale('xs', euiTheme)} !important;
      `,
    ],
    [euiTheme]
  );

  const onOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const onSelect = useCallback(
    (sourceName: string, change: DataSourceSelectionChange) => {
      const newSources =
        change === DataSourceSelectionChange.Add
          ? currentSources.includes(sourceName)
            ? currentSources
            : [...currentSources, sourceName]
          : currentSources.filter((s) => s !== sourceName);
      onChangeSources(newSources);
    },
    [currentSources, onChangeSources]
  );

  return (
    <div data-test-subj="ESQLEditor-visor-sources-dropdown">
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive={false}
        css={isDisabled ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
      >
        <EuiFlexItem grow={true} css={shrinkableContainerCss}>
          <div ref={triggerRef}>
            <EuiFormControlLayout compressed isDropdown fullWidth>
              <EuiFormControlButton
                role="combobox"
                compressed
                title={currentSources.join(', ')}
                data-test-subj="visorSourcesDropdownButton"
                aria-expanded={isOpen}
                value={
                  <EuiFlexGroup
                    component="span"
                    alignItems="center"
                    gutterSize="s"
                    responsive={false}
                    css={{ maxWidth: '100%' }}
                  >
                    <span className="eui-textTruncate">{currentSources.join(', ')}</span>
                  </EuiFlexGroup>
                }
                css={triggerCss}
                onClick={onOpen}
              >
                {Boolean(currentSources.length) && (
                  <EuiNotificationBadge color="subdued">
                    {currentSources.length}
                  </EuiNotificationBadge>
                )}
              </EuiFormControlButton>
            </EuiFormControlLayout>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
      <DataSourceBrowser
        isOpen={isOpen}
        isTimeseries={isTimeseries}
        selectedSources={currentSources}
        onClose={() => setIsOpen(false)}
        onSelect={onSelect}
        anchorEl={triggerRef.current}
      />
    </div>
  );
}
