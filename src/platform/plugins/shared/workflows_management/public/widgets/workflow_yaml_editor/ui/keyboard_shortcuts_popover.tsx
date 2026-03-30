/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { isMac } from '@kbn/shared-ux-utility';
import { kbdStyles } from './kbd_styles';

const COMMAND_KEY = isMac ? '⌘' : 'Ctrl';

const shortcuts = [
  {
    label: i18n.translate('workflows.yamlEditor.shortcuts.run', {
      defaultMessage: 'Run workflow',
    }),
    keys: [COMMAND_KEY, 'Enter'],
  },
  {
    label: i18n.translate('workflows.yamlEditor.shortcuts.saveAndRun', {
      defaultMessage: 'Save and run',
    }),
    keys: [COMMAND_KEY, 'Shift', 'Enter'],
  },
  {
    label: i18n.translate('workflows.yamlEditor.shortcuts.save', {
      defaultMessage: 'Save',
    }),
    keys: [COMMAND_KEY, 'S'],
  },
  {
    label: i18n.translate('workflows.yamlEditor.shortcuts.comment', {
      defaultMessage: 'Comment/uncomment',
    }),
    keys: [COMMAND_KEY, '/'],
  },
  {
    label: i18n.translate('workflows.yamlEditor.shortcuts.actionsMenu', {
      defaultMessage: 'Open actions menu',
    }),
    keys: [COMMAND_KEY, 'K'],
  },
  {
    label: i18n.translate('workflows.yamlEditor.shortcuts.find', {
      defaultMessage: 'Find',
    }),
    keys: [COMMAND_KEY, 'F'],
  },
];

export function KeyboardShortcutsPopover() {
  const { euiTheme } = useEuiTheme();
  const styles = useMemoCss(componentStyles);
  const [isOpen, setIsOpen] = useState(false);
  const popoverTitleId = useGeneratedHtmlId();

  const label = i18n.translate('workflows.yamlEditor.shortcuts.label', {
    defaultMessage: 'Keyboard shortcuts',
  });

  return (
    <EuiPopover
      data-test-subj="workflowYamlEditorKeyboardShortcutsPopover"
      aria-labelledby={popoverTitleId}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="upRight"
      panelPaddingSize="none"
      button={
        <EuiToolTip content={label} delay="long" disableScreenReaderOutput>
          <EuiButtonIcon
            size="xs"
            iconType="keyboard"
            data-test-subj="workflowYamlEditorKeyboardShortcutsButton"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={label}
            color="primary"
          />
        </EuiToolTip>
      }
    >
      <EuiPopoverTitle id={popoverTitleId} paddingSize="s">
        {label}
      </EuiPopoverTitle>
      <div css={{ padding: euiTheme.size.m }}>
        <EuiFlexGroup direction="column" gutterSize="s">
          {shortcuts.map(({ label: shortcutLabel, keys }) => (
            <EuiFlexItem key={shortcutLabel}>
              <EuiFlexGroup
                alignItems="center"
                justifyContent="spaceBetween"
                gutterSize="m"
                responsive={false}
              >
                <EuiFlexItem grow={false}>
                  <EuiText size="s">{shortcutLabel}</EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" css={styles.keys}>
                    {keys.map((key) => (
                      <kbd key={key}>{key}</kbd>
                    ))}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
}

const componentStyles = {
  keys: (euiThemeContext: UseEuiTheme) =>
    css({
      display: 'flex',
      gap: 2,
      '& kbd': {
        ...kbdStyles(euiThemeContext),
        minWidth: 20,
        textAlign: 'center' as const,
        color: euiThemeContext.euiTheme.colors.textSubdued,
        fontWeight: euiThemeContext.euiTheme.font.weight.medium,
      },
    }),
};
