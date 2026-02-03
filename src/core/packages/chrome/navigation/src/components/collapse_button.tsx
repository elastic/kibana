/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiButtonIcon, EuiModal, EuiModalHeader, EuiModalHeaderTitle, EuiModalBody, EuiSwitch, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { FC } from 'react';
import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { PRIMARY_NAVIGATION_ID } from '../constants';

interface Props {
  isCollapsed: boolean;
  showLabels: boolean;
  showSecondaryPanel: boolean;
  toggle: (isCollapsed: boolean) => void;
  onSetShowLabels: (showLabels: boolean) => void;
  onSetShowSecondaryPanel: (showSecondaryPanel: boolean) => void;
}

const sideNavCollapseButtonStyles = (euiTheme: UseEuiTheme['euiTheme']) => {
  return {
    sideNavCollapseButtonWrapper: css`
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: ${euiTheme.size.xxl};
    `,
    sideNavCollapseButton: css`
      &.euiButtonIcon:hover {
        transform: none;
      }
    `,
  };
};

/**
 * Button for the side navigation that opens a modal
 */
export const SideNavCollapseButton: FC<Props> = ({
  isCollapsed,
  showLabels,
  showSecondaryPanel,
  toggle,
  onSetShowLabels,
  onSetShowSecondaryPanel,
}) => {
  const iconType = 'brush';
  const { euiTheme } = useEuiTheme();
  const styles = useMemo(() => sideNavCollapseButtonStyles(euiTheme), [euiTheme]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const closeModal = () => setIsModalOpen(false);
  const openModal = () => setIsModalOpen(true);

  return (
    <>
      <div className="sideNavCollapseButtonWrapper" css={styles.sideNavCollapseButtonWrapper}>
        <EuiButtonIcon
          data-test-subj="sideNavCollapseButton"
          css={styles.sideNavCollapseButton}
          size="s"
          color="text"
          iconType={iconType}
          aria-label={i18n.translate('core.ui.chrome.sideNavigation.openModalButtonLabel', {
            defaultMessage: 'Open navigation menu',
          })}
          aria-controls={PRIMARY_NAVIGATION_ID}
          onClick={openModal}
        />
      </div>
      {isModalOpen && (
        <EuiModal
          onClose={closeModal}
          aria-labelledby="navigation-modal-title"
          maxWidth={800}
          style={{ width: '600px' }}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id="navigation-modal-title">
              {i18n.translate('core.ui.chrome.sideNavigation.modalTitle', {
                defaultMessage: 'Navigation preferences',
              })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiFlexGroup direction="row" gutterSize="l">
              <EuiFlexItem>
                <EuiSwitch
                  label={i18n.translate('core.ui.chrome.sideNavigation.showLabelsLabel', {
                    defaultMessage: 'Show labels',
                  })}
                  checked={showLabels}
                  onChange={(e) => onSetShowLabels(e.target.checked)}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiSwitch
                  label={i18n.translate('core.ui.chrome.sideNavigation.showSecondaryNavigationLabel', {
                    defaultMessage: 'Show secondary navigation',
                  })}
                  checked={showSecondaryPanel}
                  onChange={(e) => onSetShowSecondaryPanel(e.target.checked)}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiModalBody>
        </EuiModal>
      )}
    </>
  );
};
