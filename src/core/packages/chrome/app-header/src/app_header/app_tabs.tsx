/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiIcon,
  EuiIconTip,
  EuiNotificationBadge,
  EuiPopover,
  EuiTab,
  EuiTabs,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { AppHeaderTab, AppHeaderTabActions } from '../types';

export interface AppTabsProps {
  tabs?: AppHeaderTab[];
}

const renderTabBadge = (badge: AppHeaderTab['badge']) => {
  if (badge === undefined) return undefined;

  if (typeof badge === 'number') {
    return (
      <EuiNotificationBadge color="subdued" size="m">
        {badge}
      </EuiNotificationBadge>
    );
  }

  return badge.tooltip !== undefined ? (
    <EuiIconTip type={badge.iconType} content={badge.tooltip} position="bottom" />
  ) : (
    <EuiIcon type={badge.iconType} aria-hidden />
  );
};

// a11y caveat: EuiTab renders `append` inside the tab's own `<button role="tab">`/`<a href>`, so
// this trigger is an interactive element nested in an interactive element (invalid HTML, imperfect
// a11y tree). `append` is EuiTab's only slot; a proper fix needs EUI-level support. Accepted for now.
const TabActions = ({ actions }: { actions: AppHeaderTabActions }) => {
  const [isOpen, setIsOpen] = useState(false);

  const items = actions.items.map((item) => (
    <EuiContextMenuItem
      key={item.id}
      icon={item.iconType}
      disabled={typeof item.disabled === 'function' ? item.disabled() : item.disabled}
      data-test-subj={item['data-test-subj']}
      onClick={(event) => {
        // Portaled popover content still bubbles through the React tree to the tab.
        event.preventDefault();
        event.stopPropagation();
        setIsOpen(false);
        item.onClick();
      }}
    >
      {item.label}
    </EuiContextMenuItem>
  ));

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      panelPaddingSize="none"
      aria-label={actions.ariaLabel}
      button={
        <EuiToolTip content={actions.ariaLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="ellipsis"
            size="xs"
            display="empty"
            aria-label={actions.ariaLabel}
            data-test-subj={actions['data-test-subj']}
            onClick={(event: React.MouseEvent) => {
              // The trigger lives inside the tab element, so prevent tab navigation/selection.
              event.preventDefault();
              event.stopPropagation();
              setIsOpen((open) => !open);
            }}
          />
        </EuiToolTip>
      }
    >
      <EuiContextMenuPanel items={items} />
    </EuiPopover>
  );
};

// The actions button stays mounted and always occupies its slot in layout, so
// selecting/deselecting a tab never reflows the strip. Only `opacity` animates it in
// and out — a compositor property, so the fade stays smooth even while a tab switch
// blocks the main thread rendering the next view. A layout animation (width/margin)
// can't: it needs the main thread every frame, gets starved by that work, and snaps.
// The empty slot a deselected tab leaves is hidden by sliding the trailing tabs over
// it — see AppTabs.
const TabActionsSlot = ({
  actions,
  isSelected,
}: {
  actions: AppHeaderTabActions;
  isSelected: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const collapseRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Keep the hidden actions out of the tab order and the a11y tree.
    collapseRef.current?.toggleAttribute('inert', !isSelected);
  }, [isSelected]);

  return (
    <span
      ref={collapseRef}
      css={css`
        display: flex;
        opacity: ${isSelected ? 1 : 0};
        transition: opacity ${euiTheme.animation.fast} ease;
        @media (prefers-reduced-motion: reduce) {
          transition: none;
        }
      `}
    >
      <TabActions actions={actions} />
    </span>
  );
};

const TabAppend = ({ tab, actions }: { tab: AppHeaderTab; actions: AppHeaderTabActions }) => {
  const { euiTheme } = useEuiTheme();
  const badge = renderTabBadge(tab.badge);
  const slot = <TabActionsSlot actions={actions} isSelected={Boolean(tab.isSelected)} />;

  if (badge === undefined) {
    return slot;
  }

  return (
    <span
      css={css`
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.xs};
      `}
    >
      {badge}
      {slot}
    </span>
  );
};

const renderTabAppend = (tab: AppHeaderTab) => {
  // Tabs without actions keep their plain badge (or nothing) — unchanged behavior.
  if (tab.actions === undefined) {
    return renderTabBadge(tab.badge);
  }

  return <TabAppend tab={tab} actions={tab.actions} />;
};

export const AppTabs = React.memo<AppTabsProps>(({ tabs }) => {
  const { euiTheme } = useEuiTheme();

  if (!tabs?.length) return null;

  // An action tab always reserves room for its actions button (the xs button,
  // euiTheme.size.l, plus the label→button gap, euiTheme.size.s) so the strip never
  // reflows on selection. While such a tab is deselected its button is hidden, so
  // every tab after it slides left by that reserved width to close the gap. The slide
  // is a `transform` (compositor), so it stays smooth even while a tab switch blocks
  // the main thread — which is exactly why a width/layout animation couldn't. Assumes
  // an actions-only slot (no badge), the only current usage.
  const reservedWidth = `(${euiTheme.size.l} + ${euiTheme.size.s})`;

  let actionTabsBefore = 0; // action tabs preceding the current tab
  let hiddenActionTabsBefore = 0; // ...of those, how many are deselected (button hidden)

  return (
    <EuiTabs size="m" bottomBorder={false}>
      {tabs.map((tab) => {
        const isTrailing = actionTabsBefore > 0;
        const shift = hiddenActionTabsBefore;

        if (tab.actions !== undefined) {
          actionTabsBefore += 1;
          if (!tab.isSelected) hiddenActionTabsBefore += 1;
        }

        return (
          <EuiTab
            key={tab.id}
            isSelected={tab.isSelected}
            onClick={tab.onClick}
            href={tab.href}
            data-test-subj={tab['data-test-subj']}
            disabled={tab.disabled}
            append={renderTabAppend(tab)}
            css={
              isTrailing
                ? css`
                    transform: translateX(calc(${reservedWidth} * ${-shift}));
                    transition: transform ${euiTheme.animation.fast} ease;
                    @media (prefers-reduced-motion: reduce) {
                      transition: none;
                    }
                  `
                : undefined
            }
          >
            {tab.toolTipContent !== undefined ? (
              <EuiToolTip content={tab.toolTipContent} position="bottom">
                <span tabIndex={0}>{tab.label}</span>
              </EuiToolTip>
            ) : (
              tab.label
            )}
          </EuiTab>
        );
      })}
    </EuiTabs>
  );
});

AppTabs.displayName = 'AppTabs';
