/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KeyboardEvent } from 'react';
import React from 'react';
import { useIsWithinBreakpoints } from '@elastic/eui';
import { css } from '@emotion/react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { MenuItem, NavigationStructure, SecondaryMenuItem, SideNavLogo } from '../../types';
import { NestedSecondaryMenu } from './nested_secondary_menu';
import { SecondaryMenu } from './secondary_menu';
import { SideNav } from './side_nav';
import { getHasSubmenu } from '../utils/get_has_submenu';
import { useLayoutWidth } from '../hooks/use_layout_width';
import { useNavigation } from '../hooks/use_navigation';
import { useResponsiveMenu } from '../hooks/use_responsive_menu';
import { focusMainContent } from '../utils/focus_main_content';
import { MAX_FOOTER_ITEMS } from '../constants';

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
   * Optional data-test-subj attribute for testing purposes.
   */
  'data-test-subj'?: string;
}

export const Navigation = ({
  activeItemId,
  isCollapsed: isCollapsedProp,
  items,
  logo,
  setWidth,
  ...rest
}: NavigationProps) => {
  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const isCollapsed = isMobile || isCollapsedProp;

  const { activePageId, activeSubpageId, isSidePanelOpen, navigateTo, sidePanelContent } =
    useNavigation(isCollapsed, items, logo.id, activeItemId);

  const { overflowMenuItems, primaryMenuRef, visibleMenuItems } = useResponsiveMenu(
    isCollapsed,
    items
  );

  useLayoutWidth({ isCollapsed, isSidePanelOpen, setWidth });

  const handleMainItemClick = (item: MenuItem) => {
    navigateTo(item);
    focusMainContent();
  };

  const handleSubMenuItemClick = (item: MenuItem, subItem: SecondaryMenuItem) => {
    navigateTo(item, subItem);
    focusMainContent();
  };

  const handleFooterItemKeyDown = (item: MenuItem, e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      // Required for entering the popover with Enter or Space key
      // Otherwise the navigation happens immediately
      e.preventDefault();
      navigateTo(item);
      focusMainContent();
    }
  };

  const handleLogoClick = () => {
    navigateTo(logo);
    focusMainContent();
  };

  return (
    <div
      css={css`
        display: flex;
      `}
      data-test-subj={rest['data-test-subj'] ?? 'navigation-root'}
    >
      <SideNav isCollapsed={isCollapsed}>
        <SideNav.Logo
          isActive={activePageId === logo.id}
          isCollapsed={isCollapsed}
          onClick={handleLogoClick}
          {...logo}
        />

        <SideNav.PrimaryMenu ref={primaryMenuRef} isCollapsed={isCollapsed}>
          {visibleMenuItems.map((item) => (
            <SideNav.Popover
              key={item.id}
              container={document.documentElement}
              hasContent={getHasSubmenu(item)}
              isSidePanelOpen={!isCollapsed && item.id === sidePanelContent?.id}
              label={item.label}
              trigger={
                <SideNav.PrimaryMenuItem
                  isCollapsed={isCollapsed}
                  isActive={item.id === sidePanelContent?.id}
                  hasContent={getHasSubmenu(item)}
                  onClick={() => handleMainItemClick(item)}
                  {...item}
                >
                  {item.label}
                </SideNav.PrimaryMenuItem>
              }
            >
              {(closePopover) => (
                <SecondaryMenu title={item.label} badgeType={item.badgeType}>
                  {item.sections?.map((section) => (
                    <SecondaryMenu.Section key={section.id} label={section.label}>
                      {section.items.map((subItem) => (
                        <SecondaryMenu.Item
                          key={subItem.id}
                          isActive={subItem.id === activeSubpageId}
                          onClick={() => {
                            if (subItem.href) {
                              handleSubMenuItemClick(item, subItem);
                              closePopover();
                            }
                          }}
                          testSubjPrefix="popoverItem"
                          {...subItem}
                        >
                          {subItem.label}
                        </SecondaryMenu.Item>
                      ))}
                    </SecondaryMenu.Section>
                  ))}
                </SecondaryMenu>
              )}
            </SideNav.Popover>
          ))}

          {overflowMenuItems.length > 0 && (
            <SideNav.Popover
              container={document.documentElement}
              hasContent
              isSidePanelOpen={false}
              label={i18n.translate('core.ui.chrome.sideNavigation.moreMenuLabel', {
                defaultMessage: 'More',
              })}
              persistent
              trigger={
                <SideNav.PrimaryMenuItem
                  as="button"
                  data-test-subj="sideNavMoreMenuItem"
                  isActive={overflowMenuItems.some((item) => item.id === sidePanelContent?.id)}
                  isCollapsed={isCollapsed}
                  iconType="boxesVertical"
                  hasContent
                  href=""
                  id="more-menu"
                  label={i18n.translate('core.ui.chrome.sideNavigation.moreMenuItemLabel', {
                    defaultMessage: 'More',
                  })}
                >
                  <FormattedMessage
                    id="core.ui.chrome.sideNavigation.moreMenuItemText"
                    defaultMessage="More"
                  />
                </SideNav.PrimaryMenuItem>
              }
            >
              {(closePopover) =>
                isCollapsed ? (
                  <NestedSecondaryMenu>
                    <NestedSecondaryMenu.Panel
                      id="main"
                      title={i18n.translate(
                        'core.ui.chrome.sideNavigation.nestedSecondaryMenuMoreTitle',
                        { defaultMessage: 'More' }
                      )}
                    >
                      <NestedSecondaryMenu.Section hasGap>
                        {overflowMenuItems.map((item) => {
                          const hasSubItems = getHasSubmenu(item);

                          return (
                            <NestedSecondaryMenu.PrimaryMenuItem
                              key={item.id}
                              isActive={item.id === activePageId}
                              isCollapsed={isCollapsed}
                              hasSubmenu={hasSubItems}
                              submenuPanelId={hasSubItems ? `submenu-${item.id}` : undefined}
                              onClick={() => {
                                if (!hasSubItems) {
                                  navigateTo(item);
                                  closePopover();
                                  focusMainContent();
                                }
                              }}
                              {...item}
                            >
                              {item.label}
                            </NestedSecondaryMenu.PrimaryMenuItem>
                          );
                        })}
                      </NestedSecondaryMenu.Section>
                    </NestedSecondaryMenu.Panel>
                    {overflowMenuItems.filter(getHasSubmenu).map((item) => (
                      <NestedSecondaryMenu.Panel
                        key={`submenu-${item.id}`}
                        id={`submenu-${item.id}`}
                      >
                        <NestedSecondaryMenu.Header title={item.label} />
                        {item.sections?.map((section) => (
                          <NestedSecondaryMenu.Section
                            key={section.id}
                            label={section.label}
                            hasGap={!!section.label}
                          >
                            {section.items.map((subItem) => (
                              <NestedSecondaryMenu.Item
                                key={subItem.id}
                                isActive={subItem.id === activeSubpageId}
                                onClick={() => {
                                  navigateTo(item, subItem);
                                  closePopover();
                                  focusMainContent();
                                }}
                                {...subItem}
                              >
                                {subItem.label}
                              </NestedSecondaryMenu.Item>
                            ))}
                          </NestedSecondaryMenu.Section>
                        ))}
                      </NestedSecondaryMenu.Panel>
                    ))}
                  </NestedSecondaryMenu>
                ) : (
                  <SecondaryMenu
                    title={i18n.translate('core.ui.chrome.sideNavigation.secondaryMenuMoreTitle', {
                      defaultMessage: 'More',
                    })}
                  >
                    <SecondaryMenu.Section hasGap>
                      {overflowMenuItems.map((item) => (
                        <SideNav.PrimaryMenuItem
                          key={item.id}
                          isActive={item.id === activePageId}
                          isCollapsed={isCollapsed}
                          hasContent
                          onClick={() => {
                            navigateTo(item);
                            closePopover();
                            focusMainContent();
                          }}
                          isHorizontal
                          {...item}
                        >
                          {item.label}
                        </SideNav.PrimaryMenuItem>
                      ))}
                    </SecondaryMenu.Section>
                  </SecondaryMenu>
                )
              }
            </SideNav.Popover>
          )}
        </SideNav.PrimaryMenu>

        <SideNav.Footer isCollapsed={isCollapsed}>
          {items.footerItems.slice(0, MAX_FOOTER_ITEMS).map((item) => (
            <SideNav.Popover
              key={item.id}
              hasContent={getHasSubmenu(item)}
              isSidePanelOpen={!isCollapsed && item.id === sidePanelContent?.id}
              label={item.label}
              persistent={false}
              container={document.documentElement}
              trigger={
                <SideNav.FooterItem
                  isActive={item.id === sidePanelContent?.id}
                  onClick={() => navigateTo(item)}
                  hasContent={getHasSubmenu(item)}
                  onKeyDown={(e) => handleFooterItemKeyDown(item, e)}
                  {...item}
                />
              }
            >
              {(closePopover) => (
                <SecondaryMenu title={item.label} badgeType={item.badgeType}>
                  {item.sections?.map((section) => (
                    <SecondaryMenu.Section key={section.id} label={section.label}>
                      {section.items.map((subItem) => (
                        <SecondaryMenu.Item
                          key={subItem.id}
                          isActive={
                            subItem.id === activeSubpageId ||
                            (subItem.id === activePageId && !activeSubpageId)
                          }
                          onClick={() => {
                            if (subItem.href) {
                              handleSubMenuItemClick(item, subItem);
                              closePopover();
                            }
                          }}
                          {...subItem}
                          testSubjPrefix="popoverFooterItem"
                        >
                          {subItem.label}
                        </SecondaryMenu.Item>
                      ))}
                    </SecondaryMenu.Section>
                  ))}
                </SecondaryMenu>
              )}
            </SideNav.Popover>
          ))}
        </SideNav.Footer>
      </SideNav>

      {isSidePanelOpen && sidePanelContent && (
        <SideNav.Panel>
          <SecondaryMenu
            badgeType={sidePanelContent.badgeType}
            isPanel
            title={sidePanelContent.label}
          >
            {sidePanelContent.sections?.map((section) => (
              <SecondaryMenu.Section key={section.id} label={section.label}>
                {section.items.map((subItem) => (
                  <SecondaryMenu.Item
                    key={subItem.id}
                    isActive={subItem.id === activeSubpageId}
                    onClick={() => {
                      if (subItem.href) {
                        handleSubMenuItemClick(sidePanelContent, subItem);
                      }
                    }}
                    testSubjPrefix="sidePanelItem"
                    {...subItem}
                  >
                    {subItem.label}
                  </SecondaryMenu.Item>
                ))}
              </SecondaryMenu.Section>
            ))}
          </SecondaryMenu>
        </SideNav.Panel>
      )}
    </div>
  );
};
