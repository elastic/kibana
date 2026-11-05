/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiDescriptionList,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  EuiToolTip,
  euiYScroll,
  logicalCSS,
  mathWithUnits,
  useEuiTheme,
  useGeneratedHtmlId,
  type UseEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const isMacPlatform =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

/**
 * Keycap modeled on the shadcn Kbd: fixed-height muted chip, sans text, no pointer events.
 * Sizes and colors come from EUI tokens. Height matches the 1.25rem chip (base + xs).
 */
const kbdStyles = ({ euiTheme }: UseEuiTheme) => {
  const blockSize = mathWithUnits(
    [euiTheme.size.base, euiTheme.size.xs],
    (base, xs) => base + xs
  );

  return css({
    pointerEvents: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: euiTheme.size.xs,
    blockSize,
    inlineSize: 'fit-content',
    minInlineSize: blockSize,
    paddingInline: euiTheme.size.xs,
    borderRadius: euiTheme.border.radius.small,
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    fontFamily: euiTheme.font.family,
    fontSize: euiTheme.font.scale.xs * euiTheme.base,
    fontWeight: euiTheme.font.weight.medium,
    lineHeight: 1,
    color: euiTheme.colors.textSubdued,
    userSelect: 'none',
    whiteSpace: 'nowrap',
  });
};

const kbdGroupStyles = ({ euiTheme }: UseEuiTheme) =>
  css({
    display: 'inline-flex',
    alignItems: 'center',
    gap: euiTheme.size.xs,
  });

export const Kbd = ({ children }: { children: React.ReactNode }): React.ReactElement => {
  const euiThemeContext = useEuiTheme();
  return <kbd css={kbdStyles(euiThemeContext)}>{children}</kbd>;
};

export const KbdGroup = ({ children }: { children: React.ReactNode }): React.ReactElement => {
  const euiThemeContext = useEuiTheme();
  return <span css={kbdGroupStyles(euiThemeContext)}>{children}</span>;
};

const renderKeys = (keys: readonly string[]): React.ReactElement => {
  if (keys.length === 1) {
    return <Kbd>{keys[0]}</Kbd>;
  }

  return (
    <KbdGroup>
      {keys.map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
    </KbdGroup>
  );
};

interface Shortcut {
  keys: readonly string[];
  description: string;
}

const getShortcuts = (): Shortcut[] => {
  const upArrow = i18n.translate('discover.dataGrid.keyboardShortcuts.upArrowKey', {
    defaultMessage: 'Up arrow',
  });
  const downArrow = i18n.translate('discover.dataGrid.keyboardShortcuts.downArrowKey', {
    defaultMessage: 'Down arrow',
  });
  const rightArrow = i18n.translate('discover.dataGrid.keyboardShortcuts.rightArrowKey', {
    defaultMessage: 'Right arrow',
  });
  const leftArrow = i18n.translate('discover.dataGrid.keyboardShortcuts.leftArrowKey', {
    defaultMessage: 'Left arrow',
  });
  const home = i18n.translate('discover.dataGrid.keyboardShortcuts.homeKey', {
    defaultMessage: 'Home',
  });
  const end = i18n.translate('discover.dataGrid.keyboardShortcuts.endKey', {
    defaultMessage: 'End',
  });
  const ctrl = i18n.translate('discover.dataGrid.keyboardShortcuts.ctrlKey', {
    defaultMessage: 'Ctrl',
  });
  const copyModifier = isMacPlatform
    ? i18n.translate('discover.dataGrid.keyboardShortcuts.cmdKey', {
        defaultMessage: 'Cmd',
      })
    : ctrl;

  return [
    {
      keys: [upArrow],
      description: i18n.translate('discover.dataGrid.keyboardShortcuts.upArrowDescription', {
        defaultMessage: 'Move one cell up',
      }),
    },
    {
      keys: [downArrow],
      description: i18n.translate('discover.dataGrid.keyboardShortcuts.downArrowDescription', {
        defaultMessage: 'Move one cell down',
      }),
    },
    {
      keys: [rightArrow],
      description: i18n.translate('discover.dataGrid.keyboardShortcuts.rightArrowDescription', {
        defaultMessage: 'Move one cell right',
      }),
    },
    {
      keys: [leftArrow],
      description: i18n.translate('discover.dataGrid.keyboardShortcuts.leftArrowDescription', {
        defaultMessage: 'Move one cell left',
      }),
    },
    {
      keys: [home],
      description: i18n.translate('discover.dataGrid.keyboardShortcuts.homeDescription', {
        defaultMessage: 'Move to the first cell of the current row',
      }),
    },
    {
      keys: [end],
      description: i18n.translate('discover.dataGrid.keyboardShortcuts.endDescription', {
        defaultMessage: 'Move to the last cell of the current row',
      }),
    },
    {
      keys: [ctrl, home],
      description: i18n.translate('discover.dataGrid.keyboardShortcuts.ctrlHomeDescription', {
        defaultMessage: 'Move to the first cell of the current page',
      }),
    },
    {
      keys: [ctrl, end],
      description: i18n.translate('discover.dataGrid.keyboardShortcuts.ctrlEndDescription', {
        defaultMessage: 'Move to the last cell of the current page',
      }),
    },
    {
      keys: [
        i18n.translate('discover.dataGrid.keyboardShortcuts.pageUpKey', {
          defaultMessage: 'Page Up',
        }),
      ],
      description: i18n.translate('discover.dataGrid.keyboardShortcuts.pageUpDescription', {
        defaultMessage: 'Go to the last row of the previous page',
      }),
    },
    {
      keys: [
        i18n.translate('discover.dataGrid.keyboardShortcuts.pageDownKey', {
          defaultMessage: 'Page Down',
        }),
      ],
      description: i18n.translate('discover.dataGrid.keyboardShortcuts.pageDownDescription', {
        defaultMessage: 'Go to the first row of the next page',
      }),
    },
    {
      keys: [
        i18n.translate('discover.dataGrid.keyboardShortcuts.enterKey', {
          defaultMessage: 'Enter',
        }),
      ],
      description: i18n.translate('discover.dataGrid.keyboardShortcuts.enterDescription', {
        defaultMessage: 'Open cell details and actions',
      }),
    },
    {
      keys: [
        i18n.translate('discover.dataGrid.keyboardShortcuts.escapeKey', {
          defaultMessage: 'Escape',
        }),
      ],
      description: i18n.translate('discover.dataGrid.keyboardShortcuts.escapeDescription', {
        defaultMessage: 'Close cell details and actions',
      }),
    },
    {
      keys: [
        copyModifier,
        i18n.translate('discover.dataGrid.keyboardShortcuts.copyKey', {
          defaultMessage: 'C',
        }),
      ],
      description: i18n.translate('discover.dataGrid.keyboardShortcuts.copyDescription', {
        defaultMessage: 'Copy the focused cell value',
      }),
    },
  ];
};

const popoverStyles = (euiThemeContext: UseEuiTheme) => {
  const { euiTheme } = euiThemeContext;

  return css`
    ${logicalCSS('max-height', '80vh')}
    ${logicalCSS(
      'max-width',
      mathWithUnits(euiTheme.size.xxl, (x) => x * 10)
    )}
    padding: ${euiTheme.size.m};
    ${euiYScroll(euiThemeContext)}
  `;
};

export const DiscoverKeyboardShortcuts = (): React.ReactElement => {
  const euiThemeContext = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const label = i18n.translate('discover.dataGrid.keyboardShortcuts.title', {
    defaultMessage: 'Keyboard shortcuts',
  });
  const labelId = useGeneratedHtmlId();
  const shortcuts = getShortcuts();

  return (
    <EuiPopover
      aria-labelledby={labelId}
      data-test-subj="discoverKeyboardShortcutsPopover"
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downRight"
      panelPaddingSize="none"
      button={
        <EuiToolTip content={label} disableScreenReaderOutput>
          <EuiButtonIcon
            size="xs"
            iconType="keyboard"
            color="text"
            data-test-subj="discoverKeyboardShortcutsButton"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={label}
          />
        </EuiToolTip>
      }
    >
      <EuiPopoverTitle paddingSize="s">
        <h2 id={labelId}>{label}</h2>
      </EuiPopoverTitle>
      <EuiText css={popoverStyles(euiThemeContext)} size="xs">
        <EuiDescriptionList
          aria-labelledby={labelId}
          type="column"
          columnWidths={['auto', 'auto']}
          align="center"
          compressed
          listItems={shortcuts.map(({ keys, description }) => ({
            title: renderKeys(keys),
            description,
          }))}
        />
      </EuiText>
    </EuiPopover>
  );
};

const isScreenReaderShortcutControl = (control: React.ReactElement): boolean =>
  typeof control.props === 'object' &&
  control.props !== null &&
  'showOnFocus' in (control.props as Record<string, unknown>);

/**
 * EuiDataGrid paints shortcut keys as unstyled kbd inside a portaled popover.
 * Replace the visible control so Discover can restyle the keycaps. Keep the
 * screen-reader-only fallback EUI uses when shortcuts are hidden.
 */
export const withDiscoverKeyboardShortcuts = (control: React.ReactNode): React.ReactNode => {
  if (!React.isValidElement(control) || isScreenReaderShortcutControl(control)) {
    return control;
  }

  return <DiscoverKeyboardShortcuts />;
};
