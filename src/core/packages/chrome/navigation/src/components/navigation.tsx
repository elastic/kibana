/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useMemo, useEffect, useCallback, type ReactNode } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useIsWithinBreakpoints, EuiButton, useEuiTheme } from '@elastic/eui';

import type { NavigationStructure, SideNavLogo, MenuItem, SecondaryMenuItem } from '../../types';
import {
  MAIN_PANEL_ID,
  MAX_FOOTER_ITEMS,
  MORE_MENU_ID,
  NAVIGATION_ROOT_SELECTOR,
  NAVIGATION_SELECTOR_PREFIX,
} from '../constants';
import { SideNav } from './side_nav';
import { SideNavCollapseButton } from './collapse_button';
import { focusMainContent } from '../utils/focus_main_content';
import { getHasSubmenu } from '../utils/get_has_submenu';
import { useLayoutWidth } from '../hooks/use_layout_width';
import { useNavigation } from '../hooks/use_navigation';
import { useResponsiveMenu } from '../hooks/use_responsive_menu';

const navigationWrapperStyles = css`
  display: flex;
`;

export interface NavigationProps {
  /**
   * The active path for the navigation, used for highlighting the current item.
   */
  activeItemId?: string;
  /**
   * Whether the navigation is collapsed. This can be controlled by the parent component.
   */
  isCollapsed: boolean;
  /**
   * Whether to show labels in the primary navigation.
   */
  showLabels: boolean;
  /**
   * Whether to show the secondary navigation panel (vs popovers on hover).
   */
  showSecondaryPanel: boolean;
  /**
   * The navigation structure containing primary, secondary, and footer items.
   */
  items: NavigationStructure;
  /**
   * The logo object containing the route ID, href, label, and type.
   */
  logo: SideNavLogo;
  /**
   * Required by the grid layout to set the width of the navigation slot.
   */
  setWidth: (width: number) => void;
  /**
   * (optional) Callback fired when a navigation item is clicked.
   */
  onItemClick?: (item: MenuItem | SecondaryMenuItem | SideNavLogo) => void;
  /**
   * Callback fired when the collapse button is toggled.
   *
   * The collapsed state's source of truth lives in chrome_service.tsx as a BehaviorSubject
   * that is persisted to localStorage. External consumers rely on this state.
   */
  onToggleCollapsed: (isCollapsed: boolean) => void;
  /**
   * Callback fired when show labels preference is changed.
   */
  onSetShowLabels: (showLabels: boolean) => void;
  /**
   * Callback fired when show secondary panel preference is changed.
   */
  onSetShowSecondaryPanel: (showSecondaryPanel: boolean) => void;
  /**
   * (optional) Content to display inside the side panel footer.
   */
  sidePanelFooter?: ReactNode;
  /**
   * (optional) User menu component to display in the navigation footer.
   */
  userMenu?: ReactNode;
  /**
   * (optional) data-test-subj attribute for testing purposes.
   */
  'data-test-subj'?: string;
}

export const Navigation = ({
  activeItemId,
  isCollapsed: isCollapsedProp,
  showLabels,
  showSecondaryPanel,
  items,
  logo,
  onItemClick,
  onToggleCollapsed,
  onSetShowLabels,
  onSetShowSecondaryPanel,
  setWidth,
  sidePanelFooter,
  userMenu,
  ...rest
}: NavigationProps) => {
  const { euiTheme } = useEuiTheme();
  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const isCollapsed = isMobile || isCollapsedProp;
  const popoverItemPrefix = `${NAVIGATION_SELECTOR_PREFIX}-popoverItem`;
  const popoverFooterItemPrefix = `${NAVIGATION_SELECTOR_PREFIX}-popoverFooterItem`;
  const sidePanelItemPrefix = `${NAVIGATION_SELECTOR_PREFIX}-sidePanelItem`;
  const moreMenuTriggerTestSubj = `${NAVIGATION_SELECTOR_PREFIX}-moreMenuTrigger`;

  const [isAnyPopoverLocked, setIsAnyPopoverLocked] = useState(false);

  const NAV_ITEMS_ORDER_KEY = 'core.chrome.sideNav.itemsOrder';
  const NAV_ITEMS_VISIBILITY_KEY = 'core.chrome.sideNav.itemsVisibility';
  const LOCKED_IDS = ['discover', 'dashboards'];

  // State for navigation items order and visibility
  const [navItemsOrder, setNavItemsOrder] = useState<string[]>(() => {
    try {
      const orderStr = localStorage.getItem(NAV_ITEMS_ORDER_KEY);
      return orderStr ? JSON.parse(orderStr) : [];
    } catch {
      return [];
    }
  });

  const [navItemsVisibility, setNavItemsVisibility] = useState<Record<string, boolean>>(() => {
    try {
      const visibilityStr = localStorage.getItem(NAV_ITEMS_VISIBILITY_KEY);
      return visibilityStr ? JSON.parse(visibilityStr) : {};
    } catch {
      return {};
    }
  });

  // Listen for localStorage changes (from other tabs/windows) and custom events (from same window)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === NAV_ITEMS_ORDER_KEY && e.newValue) {
        try {
          setNavItemsOrder(JSON.parse(e.newValue));
        } catch {
          // Ignore parsing errors
        }
      }
      if (e.key === NAV_ITEMS_VISIBILITY_KEY && e.newValue) {
        try {
          setNavItemsVisibility(JSON.parse(e.newValue));
        } catch {
          // Ignore parsing errors
        }
      }
    };

    const handleNavigationPreferencesChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ type: 'order' | 'visibility'; value: any }>;
      if (customEvent.detail?.type === 'order') {
        setNavItemsOrder(customEvent.detail.value);
      } else if (customEvent.detail?.type === 'visibility') {
        setNavItemsVisibility(customEvent.detail.value);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('navigationPreferencesChanged', handleNavigationPreferencesChanged);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('navigationPreferencesChanged', handleNavigationPreferencesChanged);
    };
  }, []);

  // Callbacks to update navigation items
  const handleSetNavItemsOrder = useCallback((itemIds: string[]) => {
    setNavItemsOrder(itemIds);
    try {
      localStorage.setItem(NAV_ITEMS_ORDER_KEY, JSON.stringify(itemIds));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleSetNavItemVisibility = useCallback((itemId: string, visible: boolean) => {
    setNavItemsVisibility((prev) => {
      const updated = { ...prev, [itemId]: visible };
      try {
        localStorage.setItem(NAV_ITEMS_VISIBILITY_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  }, []);

  // Filter and sort primary items based on saved preferences
  const filteredAndSortedItems = useMemo(() => {
    // Filter by visibility (default to visible if not set)
    const visibleItems = items.primaryItems.filter(
      (item) => navItemsVisibility[item.id] !== false
    );

    // Separate locked and unlocked items
    const lockedItems = visibleItems.filter((item) =>
      LOCKED_IDS.includes(item.id.toLowerCase())
    );
    const unlockedItems = visibleItems.filter(
      (item) => !LOCKED_IDS.includes(item.id.toLowerCase())
    );

    // Sort unlocked items by saved order
    const sortedUnlocked =
      navItemsOrder.length > 0
        ? navItemsOrder
            .map((id) => unlockedItems.find((item) => item.id === id))
            .filter((item): item is MenuItem => item !== undefined)
            .concat(unlockedItems.filter((item) => !navItemsOrder.includes(item.id)))
        : unlockedItems;

    return [...lockedItems, ...sortedUnlocked];
  }, [items.primaryItems, navItemsOrder, navItemsVisibility]);

  // Create filtered navigation structure for useNavigation hook
  const filteredNavigationStructure = useMemo(
    () => ({
      ...items,
      primaryItems: filteredAndSortedItems,
    }),
    [items, filteredAndSortedItems]
  );

  const {
    actualActiveItemId,
    visuallyActivePageId,
    visuallyActiveSubpageId,
    isSidePanelOpen,
    openerNode,
  } = useNavigation(isCollapsed, showSecondaryPanel, filteredNavigationStructure, logo.id, activeItemId);

  const { overflowMenuItems, primaryMenuRef, visibleMenuItems } = useResponsiveMenu(
    !showLabels,
    filteredAndSortedItems
  );

  const setSize = visibleMenuItems.length + (overflowMenuItems.length > 0 ? 1 : 0);

  useLayoutWidth({ isCollapsed, showLabels, isSidePanelOpen, setWidth });

  // Create the collapse button if a toggle callback is provided
  const collapseButton = onToggleCollapsed ? (
    <SideNavCollapseButton
      isCollapsed={isCollapsed}
      showLabels={showLabels}
      showSecondaryPanel={showSecondaryPanel}
      primaryItems={items.primaryItems}
      toggle={onToggleCollapsed}
      onSetShowLabels={onSetShowLabels}
      onSetShowSecondaryPanel={onSetShowSecondaryPanel}
      onSetNavItemsOrder={handleSetNavItemsOrder}
      onSetNavItemVisibility={handleSetNavItemVisibility}
    />
  ) : null;

  return (
    <div
      css={navigationWrapperStyles}
      data-test-subj={rest['data-test-subj'] ?? NAVIGATION_ROOT_SELECTOR}
      id={NAVIGATION_ROOT_SELECTOR}
    >
      <SideNav isCollapsed={isCollapsed} showLabels={showLabels}>
        <SideNav.Logo
          isCollapsed={!showLabels}
          isCurrent={actualActiveItemId === logo.id}
          isHighlighted={visuallyActivePageId === logo.id}
          onClick={() => onItemClick?.(logo)}
          {...logo}
        />

        <SideNav.PrimaryMenu ref={primaryMenuRef} isCollapsed={!showLabels}>
          {({ mainNavigationInstructionsId }) => (
            <>
              {visibleMenuItems.map((item, index) => {
                const { sections, ...itemProps } = item;
                const isFirstItem = index === 0;
                const ariaDescribedBy = isFirstItem ? mainNavigationInstructionsId : undefined;

                return (
                  <SideNav.Popover
                    key={item.id}
                    hasContent={getHasSubmenu(item)}
                    isSidePanelOpen={showSecondaryPanel && !isCollapsed && item.id === openerNode?.id}
                    isAnyPopoverLocked={isAnyPopoverLocked}
                    label={item.label}
                    trigger={
                      <SideNav.PrimaryMenu.Item
                        aria-describedby={ariaDescribedBy}
                        aria-posinset={index + 1}
                        aria-setsize={setSize}
                        hasContent={getHasSubmenu(item)}
                        isCollapsed={!showLabels}
                        isCurrent={actualActiveItemId === item.id}
                        isHighlighted={item.id === visuallyActivePageId}
                        onClick={() => onItemClick?.(item)}
                        {...itemProps}
                      >
                        {item.label}
                      </SideNav.PrimaryMenu.Item>
                    }
                  >
                    {(closePopover, ids) => (
                      <SideNav.SecondaryMenu
                        title={item.label}
                        badgeType={item.badgeType}
                        showSecondaryPanel={showSecondaryPanel}
                        onToggleSecondaryPanel={!showSecondaryPanel ? onSetShowSecondaryPanel : undefined}
                      >
                        {sections?.map((section, sectionIndex) => {
                          const firstNonEmptySectionIndex = item.sections?.findIndex(
                            (s) => s.items.length > 0
                          );

                          return (
                            <SideNav.SecondaryMenu.Section key={section.id} label={section.label}>
                              {section.items.map((subItem, subItemIndex) => {
                                const isFirstSubItem =
                                  sectionIndex === firstNonEmptySectionIndex && subItemIndex === 0;
                                const subItemAriaDescribedBy = isFirstSubItem
                                  ? ids?.popoverNavigationInstructionsId
                                  : undefined;
                                return (
                                  <SideNav.SecondaryMenu.Item
                                    aria-describedby={subItemAriaDescribedBy}
                                    key={subItem.id}
                                    isHighlighted={subItem.id === visuallyActiveSubpageId}
                                    isCurrent={actualActiveItemId === subItem.id}
                                    onClick={() => {
                                      onItemClick?.(subItem);
                                      if (subItem.href) {
                                        closePopover();
                                      }
                                    }}
                                    testSubjPrefix={popoverItemPrefix}
                                    {...subItem}
                                  >
                                    {subItem.label}
                                  </SideNav.SecondaryMenu.Item>
                                );
                              })}
                            </SideNav.SecondaryMenu.Section>
                          );
                        })}
                      </SideNav.SecondaryMenu>
                    )}
                  </SideNav.Popover>
                );
              })}

              {overflowMenuItems.length > 0 && (
                <SideNav.Popover
                  hasContent
                  isSidePanelOpen={false}
                  isAnyPopoverLocked={isAnyPopoverLocked}
                  setIsLocked={setIsAnyPopoverLocked}
                  label={i18n.translate('core.ui.chrome.sideNavigation.moreMenuLabel', {
                    defaultMessage: 'More',
                  })}
                  persistent
                  trigger={
                    <SideNav.PrimaryMenu.Item
                      aria-posinset={visibleMenuItems.length + 1}
                      aria-setsize={setSize}
                      data-test-subj={moreMenuTriggerTestSubj}
                      hasContent
                      iconType="boxesVertical"
                      id={MORE_MENU_ID}
                      isCollapsed={!showLabels}
                      isHighlighted={overflowMenuItems.some(
                        (item) => item.id === visuallyActivePageId
                      )}
                      label={i18n.translate('core.ui.chrome.sideNavigation.moreMenuItemLabel', {
                        defaultMessage: 'More',
                      })}
                    >
                      <FormattedMessage
                        id="core.ui.chrome.sideNavigation.moreMenuItemText"
                        defaultMessage="More"
                      />
                    </SideNav.PrimaryMenu.Item>
                  }
                >
                  {(closePopover) => (
                    <SideNav.NestedSecondaryMenu>
                      <SideNav.NestedSecondaryMenu.Panel
                        id={MAIN_PANEL_ID}
                        title={i18n.translate(
                          'core.ui.chrome.sideNavigation.nestedSecondaryMenuMoreTitle',
                          { defaultMessage: 'More' }
                        )}
                        showSecondaryPanel={showSecondaryPanel}
                        onToggleSecondaryPanel={onSetShowSecondaryPanel}
                      >
                        {({ panelNavigationInstructionsId, panelEnterSubmenuInstructionsId }) => (
                          <>
                            <div
                              css={css`
                                // Remove divider after this section
                                div[role='group'] {
                                  &::after {
                                    display: none !important;
                                  }
                                  border-bottom: none !important;
                                }
                              `}
                            >
                              <SideNav.NestedSecondaryMenu.Section>
                                {overflowMenuItems.map((item, index) => {
                                  const hasSubmenu = getHasSubmenu(item);
                                  const { sections, ...itemProps } = item;
                                  const isFirstItem = index === 0;
                                  const ariaDescribedBy =
                                    [
                                      isFirstItem && panelNavigationInstructionsId,
                                      hasSubmenu && panelEnterSubmenuInstructionsId,
                                    ]
                                      .filter(Boolean)
                                      .join(' ') || undefined;
                                  return (
                                    <SideNav.NestedSecondaryMenu.PrimaryMenuItem
                                      key={item.id}
                                      aria-describedby={ariaDescribedBy}
                                      isHighlighted={item.id === visuallyActivePageId}
                                      hasSubmenu={hasSubmenu}
                                      onClick={() => {
                                        onItemClick?.(item);
                                        if (!hasSubmenu) {
                                          closePopover();
                                          focusMainContent();
                                        }
                                      }}
                                      {...itemProps}
                                    >
                                      {item.label}
                                    </SideNav.NestedSecondaryMenu.PrimaryMenuItem>
                                  );
                                })}
                              </SideNav.NestedSecondaryMenu.Section>
                            </div>
                            <div
                              css={css`
                                padding: 0 ${euiTheme.size.m} 12px;
                              `}
                            >
                              <EuiButton
                                iconType="brush"
                                color="text"
                                size="s"
                                fullWidth
                                onClick={() => {
                                  closePopover();
                                  // Use requestAnimationFrame to ensure DOM is ready, then try multiple approaches
                                  requestAnimationFrame(() => {
                                    // First try: call global function directly
                                    if (typeof (window as any).__openNavigationPreferencesModal === 'function') {
                                      try {
                                        (window as any).__openNavigationPreferencesModal();
                                        return;
                                      } catch (e) {
                                        // If direct call fails, try event
                                      }
                                    }
                                    // Fallback: dispatch custom event
                                    const event = new CustomEvent('openNavigationPreferencesModal', { bubbles: true });
                                    window.dispatchEvent(event);
                                    document.dispatchEvent(event);
                                  });
                                }}
                                data-test-subj={`${NAVIGATION_SELECTOR_PREFIX}-navigationPreferencesButton`}
                              >
                                {i18n.translate('core.ui.chrome.sideNavigation.navigationPreferencesLabel', {
                                  defaultMessage: 'Navigation preferences',
                                })}
                              </EuiButton>
                            </div>
                          </>
                        )}
                      </SideNav.NestedSecondaryMenu.Panel>
                      {overflowMenuItems.filter(getHasSubmenu).map((item) => (
                        <SideNav.NestedSecondaryMenu.Panel
                          key={`submenu-${item.id}`}
                          id={item.id}
                          showSecondaryPanel={showSecondaryPanel}
                          onToggleSecondaryPanel={onSetShowSecondaryPanel}
                        >
                          {({ panelNavigationInstructionsId }) => (
                            <>
                              <SideNav.NestedSecondaryMenu.Header
                                title={item.label}
                                aria-describedby={panelNavigationInstructionsId}
                                showSecondaryPanel={showSecondaryPanel}
                                onToggleSecondaryPanel={onSetShowSecondaryPanel}
                              />
                              {item.sections?.map((section) => (
                                <SideNav.NestedSecondaryMenu.Section
                                  key={section.id}
                                  label={section.label}
                                >
                                  {section.items.map((subItem) => (
                                    <SideNav.NestedSecondaryMenu.Item
                                      key={subItem.id}
                                      isHighlighted={subItem.id === visuallyActiveSubpageId}
                                      isCurrent={actualActiveItemId === subItem.id}
                                      onClick={() => {
                                        onItemClick?.(subItem);
                                        closePopover();
                                        focusMainContent();
                                      }}
                                      {...subItem}
                                    >
                                      {subItem.label}
                                    </SideNav.NestedSecondaryMenu.Item>
                                  ))}
                                </SideNav.NestedSecondaryMenu.Section>
                              ))}
                            </>
                          )}
                        </SideNav.NestedSecondaryMenu.Panel>
                      ))}
                    </SideNav.NestedSecondaryMenu>
                  )}
                </SideNav.Popover>
              )}
            </>
          )}
        </SideNav.PrimaryMenu>

        <SideNav.Footer isCollapsed={!showLabels} userMenu={userMenu}>
          {({ footerNavigationInstructionsId }) => (
            <>
              {items.footerItems.slice(0, MAX_FOOTER_ITEMS).map((item, index) => {
                const { sections, ...itemProps } = item;
                const isFirstItem = index === 0;
                const ariaDescribedBy = isFirstItem ? footerNavigationInstructionsId : undefined;

                return (
                  <SideNav.Popover
                    key={item.id}
                    hasContent={getHasSubmenu(item)}
                    isSidePanelOpen={showSecondaryPanel && !isCollapsed && item.id === openerNode?.id}
                    isAnyPopoverLocked={isAnyPopoverLocked}
                    label={item.label}
                    persistent={false}
                    trigger={
                      <SideNav.Footer.Item
                        aria-describedby={ariaDescribedBy}
                        isHighlighted={item.id === visuallyActivePageId}
                        isCurrent={actualActiveItemId === item.id}
                        hasContent={getHasSubmenu(item)}
                        onClick={() => onItemClick?.(item)}
                        {...itemProps}
                      />
                    }
                  >
                    {(closePopover, ids) => (
                      <SideNav.SecondaryMenu
                        title={item.label}
                        badgeType={item.badgeType}
                        showSecondaryPanel={showSecondaryPanel}
                        onToggleSecondaryPanel={!showSecondaryPanel ? onSetShowSecondaryPanel : undefined}
                      >
                        {sections?.map((section, sectionIndex) => {
                          const firstNonEmptySectionIndex = item.sections?.findIndex(
                            (s) => s.items.length > 0
                          );
                          return (
                            <SideNav.SecondaryMenu.Section key={section.id} label={section.label}>
                              {section.items.map((subItem, subItemIndex) => {
                                const isFirstSubItem =
                                  sectionIndex === firstNonEmptySectionIndex && subItemIndex === 0;
                                const subItemAriaDescribedBy = isFirstSubItem
                                  ? ids?.popoverNavigationInstructionsId
                                  : undefined;

                                return (
                                  <SideNav.SecondaryMenu.Item
                                    aria-describedby={subItemAriaDescribedBy}
                                    key={subItem.id}
                                    isHighlighted={subItem.id === visuallyActiveSubpageId}
                                    isCurrent={actualActiveItemId === subItem.id}
                                    onClick={() => {
                                      onItemClick?.(subItem);
                                      if (subItem.href) {
                                        closePopover();
                                      }
                                    }}
                                    {...subItem}
                                    testSubjPrefix={popoverFooterItemPrefix}
                                  >
                                    {subItem.label}
                                  </SideNav.SecondaryMenu.Item>
                                );
                              })}
                            </SideNav.SecondaryMenu.Section>
                          );
                        })}
                      </SideNav.SecondaryMenu>
                    )}
                  </SideNav.Popover>
                );
              })}
            </>
          )}
        </SideNav.Footer>
      </SideNav>

      {isSidePanelOpen && openerNode && (
        <SideNav.SidePanel footer={sidePanelFooter} openerNode={openerNode}>
          {({ secondaryNavigationInstructionsId }) => {
            const firstNonEmptySectionIndex = openerNode.sections?.findIndex(
              (s) => s.items.length > 0
            );

            return (
              <SideNav.SecondaryMenu
                badgeType={openerNode.badgeType}
                isPanel
                title={openerNode.label}
                showSecondaryPanel={showSecondaryPanel}
                onToggleSecondaryPanel={onSetShowSecondaryPanel}
              >
                {openerNode.sections?.map((section, sectionIndex) => (
                  <SideNav.SecondaryMenu.Section key={section.id} label={section.label}>
                    {section.items.map((subItem, subItemIndex) => {
                      const isFirstItem =
                        sectionIndex === firstNonEmptySectionIndex && subItemIndex === 0;
                      const ariaDescribedBy = isFirstItem
                        ? secondaryNavigationInstructionsId
                        : undefined;

                      return (
                        <SideNav.SecondaryMenu.Item
                          aria-describedby={ariaDescribedBy}
                          key={subItem.id}
                          isCurrent={actualActiveItemId === subItem.id}
                          isHighlighted={subItem.id === visuallyActiveSubpageId}
                          onClick={() => onItemClick?.(subItem)}
                          testSubjPrefix={sidePanelItemPrefix}
                          {...subItem}
                        >
                          {subItem.label}
                        </SideNav.SecondaryMenu.Item>
                      );
                    })}
                  </SideNav.SecondaryMenu.Section>
                ))}
              </SideNav.SecondaryMenu>
            );
          }}
        </SideNav.SidePanel>
      )}

      {/* Mount collapse button hidden to keep modal functionality available */}
      {collapseButton && (
        <div style={{ display: 'none' }}>{collapseButton}</div>
      )}
    </div>
  );
};
