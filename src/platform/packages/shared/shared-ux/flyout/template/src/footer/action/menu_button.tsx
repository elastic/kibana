/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiContextMenu, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  FlyoutFooterMenuItem,
  FlyoutFooterMenuPanel,
  FlyoutFooterPrimaryActionMenuProps,
} from '../../types';

const menuAriaLabel = (label: string): string =>
  i18n.translate('sharedUXPackages.flyoutTemplate.footer.actionMenuAriaLabel', {
    defaultMessage: '{label} menu',
    values: { label },
  });

const resolvePanels = (
  panels: FlyoutFooterMenuPanel[],
  closePopover: () => void,
  closeOnItemClick: boolean
): FlyoutFooterMenuPanel[] => {
  const navigatedInto = new Set(
    panels.flatMap(({ items }) =>
      (items ?? []).flatMap((i) => {
        const entry = i as { panel?: unknown };
        return entry.panel != null ? [entry.panel] : [];
      })
    )
  );

  panels
    .filter(({ id, title }) => navigatedInto.has(id) && !title)
    .forEach(({ id }) => {
      if (process.env.NODE_ENV !== 'production') {
        // EUI draws the back button from the title, so an untitled nested panel traps keyboard users.
        // eslint-disable-next-line no-console
        console.warn(
          `[FlyoutTemplate] Footer action menu panel "${id}" is opened from another panel but has no \`title\`, so it renders no back button.`
        );
      }
    });

  return panels.map((panel) => {
    const {
      content: _content,
      items,
      ...rest
    } = panel as FlyoutFooterMenuPanel & {
      content?: unknown;
    };

    return {
      ...rest,
      items: (items ?? [])
        .filter((item) => !(item as { renderItem?: unknown }).renderItem)
        .map((item: FlyoutFooterMenuItem) => {
          const asEntry = item as {
            isSeparator?: boolean;
            panel?: unknown;
            href?: string;
            onClick?: (e: React.MouseEvent) => void;
          };
          const { onClick, href } = asEntry;
          // Only wrap items that are actionable (have onClick or href).
          // Adding an onClick to static items causes EUI to incorrectly render them as interactive buttons.
          if (
            !closeOnItemClick ||
            asEntry.isSeparator ||
            asEntry.panel != null ||
            (!onClick && !href)
          ) {
            return item;
          }
          return {
            ...item,
            onClick: (event: React.MouseEvent<Element, globalThis.MouseEvent>) => {
              onClick?.(event);
              closePopover();
            },
          };
        }),
    };
  });
};

/** Trigger button + popover + context menu for `FlyoutTemplate.Footer.PrimaryActionMenu`. */
export const PrimaryActionMenuButton = ({
  label,
  panels,
  initialPanelId,
  onPanelChange,
  height,
  closeOnItemClick = true,
  'aria-label': ariaLabel,
  'data-test-subj': dataTestSubj,
  ...triggerProps
}: FlyoutFooterPrimaryActionMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  // EuiContextMenu remembers which sub-menu the user was viewing. We increment this
  // count and use it as a 'key' to force the menu to reset completely every time it opens.
  const [openCount, setOpenCount] = useState(0);

  const closePopover = useCallback(() => setIsOpen(false), []);
  const togglePopover = useCallback(() => {
    if (!isOpen) setOpenCount((count) => count + 1);
    setIsOpen((open) => !open);
  }, [isOpen]);

  const resolvedPanels = useMemo(
    () => resolvePanels(panels, closePopover, closeOnItemClick),
    [panels, closePopover, closeOnItemClick]
  );

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={closePopover}
      anchorPosition="upRight"
      panelPaddingSize="none"
      aria-label={ariaLabel ?? menuAriaLabel(label)}
      panelProps={dataTestSubj ? { 'data-test-subj': `${dataTestSubj}Panel` } : undefined}
      button={
        <EuiButton
          {...triggerProps}
          type="button"
          element="button"
          isSelected={undefined}
          fill
          iconType={isOpen ? 'chevronSingleUp' : 'chevronSingleDown'}
          iconSide="right"
          onClick={togglePopover}
          aria-haspopup="dialog"
          data-test-subj={dataTestSubj}
        >
          {label}
        </EuiButton>
      }
    >
      <EuiContextMenu
        key={openCount}
        initialPanelId={initialPanelId ?? panels[0]?.id}
        panels={resolvedPanels}
        onPanelChange={onPanelChange}
        height={height}
      />
    </EuiPopover>
  );
};
