/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenu,
  EuiHorizontalRule,
  EuiIcon,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPopover,
  EuiSwitch,
  EuiSpacer,
  EuiText,
  EuiSplitButton,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ChromeHeaderAppActionsConfig } from '@kbn/core-chrome-browser';

const noop = () => {};

const ALERTS_PANEL_ID = 1;
const EXPORT_PANEL_ID = 2;

const overflowKeyPadCss = css`
  justify-content: center;
  padding-block: 8px;
`;

const overflowKeyPadItemCss = css`
  width: 72px;
  height: 64px;
  min-width: 72px;
  min-height: 48px;
`;

const primaryButtonCss = css`
  block-size: 28px;
`;

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const modalTitleId = useGeneratedHtmlId({ prefix: 'shareModal', suffix: 'title' });
  if (!isOpen) return null;
  return (
    <EuiModal
      aria-labelledby={modalTitleId}
      onClose={onClose}
      data-test-subj="discoverShareModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>Share this Discover session</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiSwitch
          label="Use absolute time range"
          checked={noop}
          onChange={noop}
        />
        <EuiSpacer size="m" />
        <EuiText>
          <p>Recipients will see all data from 15 minutes ago to now from the time viewed.</p>
        </EuiText>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton onClick={onClose} iconType="copy" fill data-test-subj="discoverShareModalClose">
          Copy link
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

interface OverflowKeyPadSectionProps {
  onShare?: () => void;
}

const OverflowKeyPadSection: React.FC<OverflowKeyPadSectionProps> = ({ onShare }) => (
  <>
    <EuiKeyPadMenu css={overflowKeyPadCss}>
      <EuiKeyPadMenuItem
        label="New"
        onClick={noop}
        css={overflowKeyPadItemCss}
        data-test-subj="headerGlobalNav-overflowNew"
      >
        <EuiIcon type="plusInCircle" size="m" />
      </EuiKeyPadMenuItem>
      <EuiKeyPadMenuItem
        label="Favorite"
        onClick={noop}
        css={overflowKeyPadItemCss}
        data-test-subj="headerGlobalNav-overflowFavorite"
      >
        <EuiIcon type="star" size="m" />
      </EuiKeyPadMenuItem>
      <EuiKeyPadMenuItem
        label="Share"
        onClick={onShare ?? noop}
        css={overflowKeyPadItemCss}
        data-test-subj="headerGlobalNav-overflowShare"
      >
        <EuiIcon type="share" size="m" />
      </EuiKeyPadMenuItem>
    </EuiKeyPadMenu>
    <EuiHorizontalRule margin="none" />
  </>
);

const saveOverflowMenuCss = css`
  width: 160px;
`;

const esqlButtonCss = css`
  block-size: 28px;
`;

interface DiscoverEsqlButtonProps {
  onClick?: () => void;
}

const DiscoverEsqlButton: React.FC<DiscoverEsqlButtonProps> = ({ onClick }) => {
  const button = (
    <EuiButton
      size="s"
      iconType="editorCodeBlock"
      minWidth={false}
      color="success"
      css={esqlButtonCss}
      onClick={onClick ?? noop}
      data-test-subj="headerGlobalNav-appActionsEsqlButton"
    >
      ES|QL
    </EuiButton>
  );
  return (
    <EuiToolTip
      content={i18n.translate('discover.localMenu.esqlTooltipLabel', {
        defaultMessage: `ES|QL is Elastic's powerful new piped query language.`,
      })}
    >
      {button}
    </EuiToolTip>
  );
};

const DiscoverSaveButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const saveSplitButtonCss = css`
    background-color: transparent !important;
    height: 28px !important;
  `;
  const saveSplitButtonSecondaryCss = css`
    background-color: transparent !important;
    height: 28px !important;
    margin-left: 0;
  `;
  const panels = [
    {
      id: 0,
      title: '',
      items: [
        { name: 'Save as', icon: 'save', onClick: () => setIsOpen(false) },
        { name: 'Reset changes', icon: 'editorUndo', onClick: () => setIsOpen(false) },
      ],
    },
  ];
  return (
    <EuiSplitButton
      css={saveSplitButtonCss}
      size="s"
      color="text"
      fill={false}
      data-test-subj="headerGlobalNav-appActionsSaveSplitButton"
      aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.saveAriaLabel', {
        defaultMessage: 'Save',
      })}
    >
      <EuiSplitButton.ActionPrimary
        css={saveSplitButtonCss}
        iconType="save"
        data-test-subj="headerGlobalNav-appActionsSaveButton"
        minWidth={false}
      >
        Save
      </EuiSplitButton.ActionPrimary>
      <EuiPopover
        button={React.cloneElement(
          <EuiSplitButton.ActionSecondary
            css={saveSplitButtonSecondaryCss}
            iconType="arrowDown"
            aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.saveOptionsAriaLabel', {
              defaultMessage: 'Save options',
            })}
            data-test-subj="headerGlobalNav-appActionsSaveDropdown"
          />,
          { onClick: () => setIsOpen(true) }
        )}
        isOpen={isOpen}
        closePopover={() => setIsOpen(false)}
        anchorPosition="downLeft"
        panelPaddingSize="none"
      >
        <EuiContextMenu css={saveOverflowMenuCss} panels={panels} initialPanelId={0} />
      </EuiPopover>
    </EuiSplitButton>
  );
};

/**
 * POC: Static header app actions config for Discover (secondary: New, Share, overflow; primary: Save, ES|QL).
 * Same pattern as setHelpExtension: set when app mounts; cleared on app change.
 * @param openShareModal - Callback to open the shared Share modal (used by secondary Share button and overflow Share keypad item).
 * @param onEsqlClick - Optional callback when ES|QL button is clicked (transition to ES|QL mode). When undefined, the ES|QL button is not shown.
 */
export function getDiscoverHeaderAppActionsConfig(
  openShareModal: () => void,
  onEsqlClick?: () => void
): ChromeHeaderAppActionsConfig {
  return {
    overflowPanels: [
      {
        id: 0,
        title: '',
        items: [
          { renderItem: () => <OverflowKeyPadSection onShare={openShareModal} />, key: 'keypad' },
          { name: 'Open', icon: 'folderOpen', onClick: noop },
          { name: 'Inspect', icon: 'inspect', onClick: noop },
          { name: 'Data sets', icon: 'indexOpen', onClick: noop },
          { name: 'Background searches', icon: 'backgroundTask', onClick: noop },
          { isSeparator: true as const, key: 'sep2' },
          { name: 'Alerts', icon: 'bell', onClick: noop, panel: ALERTS_PANEL_ID },
          { name: 'Export', icon: 'exportAction', onClick: noop, panel: EXPORT_PANEL_ID },
          { isSeparator: true as const, key: 'sep3' },
          { name: 'Rename', icon: 'pencil', onClick: noop },
          { name: 'Settings', icon: 'gear', onClick: noop },
          { isSeparator: true as const, key: 'sep4' },
          { name: 'Docs', icon: 'documentation', onClick: noop },
          { name: 'Feedback', icon: 'editorComment', onClick: noop },
        ],
      },
      {
        id: ALERTS_PANEL_ID,
        title: 'Alerts',
        items: [
          { name: 'Create search threshold rule', icon: 'bell', onClick: noop },
          { name: 'Manage rules and connectors', icon: 'document', onClick: noop },
        ],
      },
      {
        id: EXPORT_PANEL_ID,
        title: 'Export',
        items: [
          { name: 'CSV', icon: 'calendar', onClick: noop },
          { name: 'Schedule export', icon: 'calendar', onClick: noop },
        ],
      },
    ],
    secondaryActions: [
      <EuiButtonIcon
        key="new"
        size="xs"
        color="text"
        iconType="plusInCircle"
        data-test-subj="headerGlobalNav-appActionsNewButton"
      >
        New
      </EuiButtonIcon>,
      <EuiButtonIcon
        key="share"
        size="xs"
        color="text"
        iconType="share"
        onClick={openShareModal}
        data-test-subj="headerGlobalNav-appActionsShareButton"
      >
        Share
      </EuiButtonIcon>,
    ],
    primaryActions: [
      <DiscoverSaveButton key="save" />,
      ...(onEsqlClick ? [<DiscoverEsqlButton key="esql" onClick={onEsqlClick} />] : []),
    ],
  };
}
