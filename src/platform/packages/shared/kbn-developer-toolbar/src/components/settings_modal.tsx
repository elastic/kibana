/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { useToolbarState } from '../hooks/use_toolbar_state';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const modalStyles = css`
  width: 400px;
`;

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const state = useToolbarState();

  const { toggleItemEnabled, isEnabled, items } = state;
  if (!isOpen) {
    return null;
  }

  return (
    <EuiModal onClose={onClose} css={modalStyles} aria-label={'Developer Toolbar Settings'}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>Developer Toolbar Settings</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText size="s" color="subdued">
          <p>Toggle indicators on or off. Changes are saved automatically.</p>
        </EuiText>
        <EuiSpacer size="m" />

        <EuiSwitch
          label="Environment Info"
          checked={isEnabled('environmentInfo')}
          onChange={() => toggleItemEnabled('environmentInfo')}
        />
        <EuiSpacer size="s" />

        <EuiSwitch
          label="Frame Jank Monitor"
          checked={isEnabled('frameJank')}
          onChange={() => toggleItemEnabled('frameJank')}
        />
        <EuiSpacer size="s" />

        <EuiSwitch
          label="Memory Usage"
          checked={isEnabled('memoryMonitor')}
          onChange={() => toggleItemEnabled('memoryMonitor')}
        />
        <EuiSpacer size="s" />

        <EuiSwitch
          label="Console Errors"
          checked={isEnabled('errorsMonitor')}
          onChange={() => toggleItemEnabled('errorsMonitor')}
        />
        <EuiSpacer size="s" />

        {items.length > 0 && (
          <>
            {items.map((item) => {
              const isItemEnabled = isEnabled(item.id);
              const label = item.id;

              return (
                <React.Fragment key={item.id}>
                  <EuiSwitch
                    label={label}
                    checked={isItemEnabled}
                    onChange={() => toggleItemEnabled(item.id)}
                  />
                  <EuiSpacer size="s" />
                </React.Fragment>
              );
            })}
          </>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButton onClick={onClose} fill>
          Close
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
