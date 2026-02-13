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
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenu,
  EuiHeaderLinks,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/**
 * Overflow menu items for Discover's global header (prototype: dumb links, no handlers).
 * Other apps can supply a different list when using the same global header actions slot.
 */
const noop = () => {};

const OVERFLOW_PANELS = [
  {
    id: 0,
    title: '',
    items: [
      {
        name: i18n.translate('discover.globalHeaderActions.overflow.new', {
          defaultMessage: 'New',
        }),
        icon: 'plusInCircle',
        onClick: noop,
      },
      {
        name: i18n.translate('discover.globalHeaderActions.overflow.favorite', {
          defaultMessage: 'Favorite',
        }),
        icon: 'star',
        onClick: noop,
      },
      {
        name: i18n.translate('discover.globalHeaderActions.overflow.share', {
          defaultMessage: 'Share',
        }),
        icon: 'share',
        onClick: noop,
      },
    ],
  },
  {
    id: 1,
    title: '',
    items: [
      { name: i18n.translate('discover.globalHeaderActions.overflow.open', { defaultMessage: 'Open' }), icon: 'folderOpen', onClick: noop },
      { name: i18n.translate('discover.globalHeaderActions.overflow.inspect', { defaultMessage: 'Inspect' }), icon: 'inspector', onClick: noop },
      { name: i18n.translate('discover.globalHeaderActions.overflow.dataSets', { defaultMessage: 'Data sets' }), icon: 'indexOpen', onClick: noop },
      { name: i18n.translate('discover.globalHeaderActions.overflow.backgroundSearches', { defaultMessage: 'Background searches' }), icon: 'search', onClick: noop },
      { name: i18n.translate('discover.globalHeaderActions.overflow.alerts', { defaultMessage: 'Alerts' }), icon: 'bell', onClick: noop },
      { name: i18n.translate('discover.globalHeaderActions.overflow.export', { defaultMessage: 'Export' }), icon: 'exportAction', onClick: noop },
      { name: i18n.translate('discover.globalHeaderActions.overflow.rename', { defaultMessage: 'Rename' }), icon: 'pencil', onClick: noop },
      { name: i18n.translate('discover.globalHeaderActions.overflow.settings', { defaultMessage: 'Settings' }), icon: 'gear', onClick: noop },
      { name: i18n.translate('discover.globalHeaderActions.overflow.docs', { defaultMessage: 'Docs' }), icon: 'documentation', onClick: noop },
      { name: i18n.translate('discover.globalHeaderActions.overflow.feedback', { defaultMessage: 'Feedback' }), icon: 'editorComment', onClick: noop },
      { name: i18n.translate('discover.globalHeaderActions.overflow.save', { defaultMessage: 'Save' }), icon: 'save', onClick: noop },
      { name: i18n.translate('discover.globalHeaderActions.overflow.saveAs', { defaultMessage: 'Save as' }), icon: 'save', onClick: noop },
      { name: i18n.translate('discover.globalHeaderActions.overflow.resetChanges', { defaultMessage: 'Reset changes' }), icon: 'editorUndo', onClick: noop },
    ],
  },
];

export const DiscoverGlobalHeaderActionsContent: React.FC = () => {
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);

  const overflowButton = (
    <EuiButtonIcon
      iconType="boxesVertical"
      aria-label={i18n.translate('discover.globalHeaderActions.overflow.ariaLabel', {
        defaultMessage: 'More actions',
      })}
      onClick={() => setIsOverflowOpen(!isOverflowOpen)}
      data-test-subj="discoverGlobalHeaderOverflowButton"
    />
  );

  return (
    <EuiHeaderLinks gutterSize="xs" popoverBreakpoints="none">
      <EuiButtonEmpty
        size="s"
        iconType="plusInCircle"
        data-test-subj="discoverGlobalHeaderNewButton"
      >
        {i18n.translate('discover.globalHeaderActions.new', { defaultMessage: 'New' })}
      </EuiButtonEmpty>
      <EuiButtonEmpty
        size="s"
        iconType="share"
        data-test-subj="discoverGlobalHeaderShareButton"
      >
        {i18n.translate('discover.globalHeaderActions.share', { defaultMessage: 'Share' })}
      </EuiButtonEmpty>
      <EuiPopover
        button={overflowButton}
        isOpen={isOverflowOpen}
        closePopover={() => setIsOverflowOpen(false)}
        anchorPosition="downRight"
        panelPaddingSize="none"
      >
        <EuiContextMenu panels={OVERFLOW_PANELS} initialPanelId={0} />
      </EuiPopover>
      <EuiButton
        size="s"
        iconType="save"
        data-test-subj="discoverGlobalHeaderSaveButton"
      >
        {i18n.translate('discover.globalHeaderActions.save', { defaultMessage: 'Save' })}
      </EuiButton>
      <EuiButtonEmpty
        size="s"
        iconType="arrowDown"
        iconSide="right"
        aria-label={i18n.translate('discover.globalHeaderActions.saveOptions.ariaLabel', {
          defaultMessage: 'Save options',
        })}
        data-test-subj="discoverGlobalHeaderSaveDropdown"
      />
      <EuiButtonEmpty
        size="s"
        iconType="editorCodeBlock"
        color="success"
        data-test-subj="discoverGlobalHeaderEsqlButton"
      >
        ES|QL
      </EuiButtonEmpty>
    </EuiHeaderLinks>
  );
};
