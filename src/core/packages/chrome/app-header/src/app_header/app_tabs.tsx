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

// A tab's actions button stays mounted and animates its width open/closed as the
// tab is selected/deselected, rather than snapping in — which shifts every tab to
// its right. The label→actions gap is collapsed along with the button so a
// deselected tab leaves no residual whitespace (see `tabWithActionsStyles`).
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
    // Keep the collapsed actions out of the tab order and the a11y tree.
    collapseRef.current?.toggleAttribute('inert', !isSelected);
  }, [isSelected]);

  return (
    <span
      ref={collapseRef}
      css={css`
        display: flex;
        align-items: center;
        overflow: hidden;
        // Animate a concrete width — the xs actions button is euiTheme.size.l square
        // — rather than the grid 0fr↔1fr trick. In an auto-width (content-sized)
        // container a single fr track interpolates non-linearly and rushes to zero at
        // the very end; a fixed px length interpolates linearly, so the collapse stays
        // smooth all the way to the finish. The gap rides along as a margin (no padding
        // floor) so it animates out cleanly too.
        inline-size: ${isSelected ? euiTheme.size.l : '0px'};
        margin-inline-start: ${isSelected ? euiTheme.size.s : '0px'};
        opacity: ${isSelected ? 1 : 0};
        transition: inline-size ${euiTheme.animation.fast} ease,
          margin-inline-start ${euiTheme.animation.fast} ease,
          opacity ${euiTheme.animation.fast} ease;
        @media (prefers-reduced-motion: reduce) {
          transition: none;
        }
      `}
    >
      <span
        css={css`
          flex: 0 0 auto;
        `}
      >
        <TabActions actions={actions} />
      </span>
    </span>
  );
};

const TabAppend = ({ tab }: { tab: AppHeaderTab }) => {
  const { euiTheme } = useEuiTheme();
  const badge = renderTabBadge(tab.badge);

  return (
    <span
      css={css`
        display: flex;
        align-items: center;
      `}
    >
      {badge !== undefined && (
        <span
          css={css`
            margin-inline-start: ${euiTheme.size.s};
          `}
        >
          {badge}
        </span>
      )}
      {tab.actions !== undefined && (
        <TabActionsSlot actions={tab.actions} isSelected={Boolean(tab.isSelected)} />
      )}
    </span>
  );
};

const renderTabAppend = (tab: AppHeaderTab) => {
  // Tabs without actions keep their plain badge (or nothing) — unchanged behavior.
  if (tab.actions === undefined) {
    return renderTabBadge(tab.badge);
  }

  return <TabAppend tab={tab} />;
};

// Collapse EuiTab's flex `gap` for tabs that carry actions; the label→actions
// spacing is re-added inside TabActionsSlot so it animates away with the button,
// leaving no residual gap when deselected. `&&` raises specificity above EuiTab's
// own emotion styles.
const tabWithActionsStyles = css`
  && {
    gap: 0;
  }
`;

export const AppTabs = React.memo<AppTabsProps>(({ tabs }) => {
  if (!tabs?.length) return null;

  return (
    <EuiTabs size="m" bottomBorder={false}>
      {tabs.map((tab) => (
        <EuiTab
          key={tab.id}
          isSelected={tab.isSelected}
          onClick={tab.onClick}
          href={tab.href}
          data-test-subj={tab['data-test-subj']}
          disabled={tab.disabled}
          append={renderTabAppend(tab)}
          css={tab.actions !== undefined ? tabWithActionsStyles : undefined}
        >
          {tab.toolTipContent !== undefined ? (
            <EuiToolTip content={tab.toolTipContent} position="bottom">
              <span tabIndex={0}>{tab.label}</span>
            </EuiToolTip>
          ) : (
            tab.label
          )}
        </EuiTab>
      ))}
    </EuiTabs>
  );
});

AppTabs.displayName = 'AppTabs';
