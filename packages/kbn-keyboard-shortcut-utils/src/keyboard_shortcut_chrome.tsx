/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  EuiBetaBadge,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiHeaderSectionItemButton,
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { type CopyPasteHandlers } from '.';

interface Props {
  appName: string;
  copyPaste?: CopyPasteHandlers;
}

export const KeyboardShortcutChrome: React.FC<Props> = ({ appName, copyPaste }) => {
  const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

  const [isOpen, setOpen] = useState(false);
  const button = (
    <EuiHeaderSectionItemButton
      onClick={() => setOpen((prev) => !prev)}
      aria-label={i18n.translate('unifiedSearch.keyboardShortcuts.icon.label', {
        defaultMessage: 'Keyboard shortcuts',
      })}
      aria-haspopup="true"
    >
      <EuiIcon type="keyboard" />
    </EuiHeaderSectionItemButton>
  );

  const listItems = [];
  const metaKey = isMac ? 'Cmd' : 'Ctrl';

  if (copyPaste?.topicId === 'timerange') {
    listItems.push(
      {
        title: (
          <>
            <kbd>{metaKey}</kbd> + <kbd>C</kbd>
          </>
        ),
        description: i18n.translate(
          'keyboardShortcuts.headerGlobalNav.helpMenu.copyTimeRangeDescription',
          {
            defaultMessage: 'Copy the current time range to your clipboard.',
          }
        ),
      },
      {
        title: (
          <>
            <kbd>{metaKey}</kbd> + <kbd>V</kbd>
          </>
        ),
        description: i18n.translate(
          'keyboardShortcuts.headerGlobalNav.helpMenu.pasteTimeRangeDescription',
          {
            defaultMessage:
              'Paste the time range from your clipboard. Try copying a time range from another tab first.',
          }
        ),
      }
    );
  }

  return (
    <EuiPopover isOpen={isOpen} button={button} closePopover={() => setOpen(false)}>
      <EuiPopoverTitle>
        <EuiFlexGroup justifyContent="spaceBetween" wrap={false}>
          <h2>
            <FormattedMessage
              id="keyboardShortcuts.headerGlobalNav.helpMenuTitle"
              defaultMessage="Keyboard shortcuts"
            />
          </h2>
          <EuiBetaBadge
            label={i18n.translate('keyboardShortcuts.headerGlobalNav.helpMenu.betaBadgeLabel', {
              defaultMessage: 'Experimental',
            })}
            iconType="beaker"
            size="s"
          />
        </EuiFlexGroup>
      </EuiPopoverTitle>

      <div style={{ maxWidth: 300 }}>
        <EuiTitle size="xxs">
          <h3>{appName}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="xs">
          <EuiDescriptionList
            compressed
            listItems={listItems}
            type="column"
            align="left"
            rowGutterSize="m"
          />
        </EuiText>
      </div>
    </EuiPopover>
  );
};
