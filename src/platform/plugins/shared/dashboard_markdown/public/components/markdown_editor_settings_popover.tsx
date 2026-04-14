/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonIcon, EuiPopover, EuiSwitch, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';
import type { MarkdownSettingsState } from '../../server/schemas';

interface Props {
  settings: MarkdownSettingsState;
  updateSettings: (next: Partial<MarkdownSettingsState>) => void;
}

const settingsDisplayName = i18n.translate('dashboardMarkdown.settingsButtonText', {
  defaultMessage: 'Settings',
});

export function MarkdownEditorSettingsPopover({ settings, updateSettings }: Props) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { open_links_in_new_tab: openLinksInNewTab } = settings ?? {};

  const onClose = useCallback(() => setIsPopoverOpen(false), []);

  const setOpenLinksInNewTab = useCallback(
    (next: boolean) => {
      updateSettings({
        open_links_in_new_tab: next,
      });
    },
    [updateSettings]
  );

  return (
    <EuiPopover
      button={
        <EuiToolTip disableScreenReaderOutput content={settingsDisplayName} position="bottom">
          <EuiButtonIcon
            iconType="gear"
            color="text"
            aria-label={settingsDisplayName}
            onClick={useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen])}
            size="s"
          />
        </EuiToolTip>
      }
      anchorPosition="downRight"
      aria-label={settingsDisplayName}
      repositionOnScroll
      panelPaddingSize="m"
      isOpen={isPopoverOpen}
      closePopover={onClose}
      focusTrapProps={{
        closeOnMouseup: true,
        clickOutsideDisables: false,
        onClickOutside: onClose,
      }}
    >
      <EuiSwitch
        compressed
        label={i18n.translate('dashboardMarkdown.openLinksInNewTab', {
          defaultMessage: 'Open links in new tab',
        })}
        color="primary"
        checked={Boolean(openLinksInNewTab)}
        onChange={(e) => setOpenLinksInNewTab(e.target.checked)}
        data-test-subj="openLinksInNewTabSwitch"
      />
    </EuiPopover>
  );
}
