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
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiNotificationBadge,
  EuiPopover,
  EuiTab,
  EuiTabs,
  EuiToolTip,
} from '@elastic/eui';
import { asOptionalPlainText, asPlainText } from './as_plain_text';
import type { AppHeaderTab, AppHeaderTabActions } from './types';

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

  const tooltip = asOptionalPlainText(badge.tooltip);

  return tooltip !== undefined ? (
    <EuiIconTip type={badge.iconType} content={tooltip} position="bottom" />
  ) : (
    <EuiIcon type={badge.iconType} aria-hidden />
  );
};

// a11y caveat: EuiTab renders `append` inside the tab's own `<button role="tab">`/`<a href>`, so
// this trigger is an interactive element nested in an interactive element (invalid HTML, imperfect
// a11y tree). `append` is EuiTab's only slot; a proper fix needs EUI-level support. Accepted for now.
const TabActions = ({ actions }: { actions: AppHeaderTabActions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ariaLabel = asPlainText(actions.ariaLabel);

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
      {asPlainText(item.label)}
    </EuiContextMenuItem>
  ));

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      panelPaddingSize="none"
      aria-label={ariaLabel}
      button={
        <EuiToolTip content={ariaLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="ellipsis"
            size="xs"
            display="empty"
            aria-label={ariaLabel}
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

const renderTabAppend = (tab: AppHeaderTab) => {
  const badge = renderTabBadge(tab.badge);
  const extra = tab.append;
  const showActions = Boolean(tab.actions && tab.isSelected);
  const parts = [badge, extra].filter(
    (part) => part !== undefined && part !== null && part !== false
  );

  if (!showActions && parts.length === 0) {
    return undefined;
  }

  if (!showActions && parts.length === 1) {
    return parts[0];
  }

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      {badge !== undefined && <EuiFlexItem grow={false}>{badge}</EuiFlexItem>}
      {extra !== undefined && extra !== null && extra !== false && (
        <EuiFlexItem grow={false}>{extra}</EuiFlexItem>
      )}
      {showActions && tab.actions && (
        <EuiFlexItem grow={false}>
          <TabActions actions={tab.actions} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const AppTabs = React.memo<AppTabsProps>(({ tabs }) => {
  if (!tabs?.length) return null;

  return (
    <EuiTabs size="m" bottomBorder={false}>
      {tabs.map((tab) => {
        const label = asPlainText(tab.label);
        const toolTipContent = asOptionalPlainText(tab.toolTipContent);

        return (
          <EuiTab
            key={tab.id}
            isSelected={tab.isSelected}
            onClick={tab.onClick}
            href={tab.href}
            data-test-subj={tab['data-test-subj']}
            disabled={tab.disabled}
            append={renderTabAppend(tab)}
          >
            {toolTipContent !== undefined ? (
              <EuiToolTip content={toolTipContent} position="bottom">
                <span tabIndex={0}>{label}</span>
              </EuiToolTip>
            ) : (
              label
            )}
          </EuiTab>
        );
      })}
    </EuiTabs>
  );
});

AppTabs.displayName = 'AppTabs';
