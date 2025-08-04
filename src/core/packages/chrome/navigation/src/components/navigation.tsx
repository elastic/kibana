/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { KeyboardEvent } from 'react';
import { useIsWithinBreakpoints } from '@elastic/eui';

import { MenuItem, NavigationStructure } from '../../types';
import { NestedSecondaryMenu } from './nested_secondary_menu';
import { SecondaryMenu } from './secondary_menu';
import { SideNav } from './side_nav';
import { getHasSubmenu } from '../utils/get_has_submenu';
import { useLayoutWidth } from '../hooks/use_layout_width';
import { useNavigation } from '../hooks/use_navigation';
import { useResponsiveMenu } from '../hooks/use_responsive_menu';
import { focusMainContent } from '../utils/focus_main_content';

const FOOTER_ITEM_LIMIT = 5;

interface NavigationProps {
  /**
   * Whether the navigation is collapsed. This can be controlled by the parent component.
   */
  isCollapsed: boolean;
  /**
   * The navigation structure containing primary, secondary, and footer items.
   */
  items: NavigationStructure;
  /**
   * The label for the logo, typically the product name.
   */
  logoLabel: string;
  /**
   * The logo type, e.g. `appObservability`, `appSecurity`, etc.
   */
  logoType: string;
  /**
   * The href for the logo link, typically the home page.
   */
  logoHref: string;
  /**
   * Required by the grid layout to set the width of the navigation slot.
   */
  setWidth: (width: number) => void;
}

export const Navigation = ({
  isCollapsed: isCollapsedProp,
  items,
  logoLabel,
  logoType,
  logoHref,
  setWidth,
}: NavigationProps) => {
  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const isCollapsed = isMobile || isCollapsedProp;

  const { currentPage, currentSubpage, isSidePanelOpen, navigateTo, sidePanelContent } =
    useNavigation({
      initialMenuItem: items.primaryItems[0],
      isCollapsed,
    });

  const { overflowMenuItems, primaryMenuRef, visibleMenuItems } = useResponsiveMenu(
    isCollapsed,
    items
  );

  useLayoutWidth({ isCollapsed, isSidePanelOpen, setWidth });

  const handleMainItemClick = (item: MenuItem) => {
    navigateTo(item);
    focusMainContent();
  };

  const handleSubMenuItemClick = (item: MenuItem, subItem: MenuItem) => {
    if (item.href && subItem.href === item.href) {
      navigateTo(item);
    } else {
      navigateTo(item, subItem);
    }
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

  return (
    <>
      <SideNav isCollapsed={isCollapsed}>
        <SideNav.Logo
          isCollapsed={isCollapsed}
          label={logoLabel}
          logoType={logoType}
          href={logoHref}
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
                  iconType={item.iconType}
                  isCollapsed={isCollapsed}
                  isCurrent={item.id === sidePanelContent?.id}
                  hasContent={getHasSubmenu(item)}
                  onClick={() => handleMainItemClick(item)}
                  {...item}
                >
                  {item.label}
                </SideNav.PrimaryMenuItem>
              }
            >
              {(closePopover) => (
                <SecondaryMenu title={item.label}>
                  {item.sections?.map((section) => (
                    <SecondaryMenu.Section key={section.id} label={section.label}>
                      {section.items.map((subItem) => (
                        <SecondaryMenu.Item
                          key={subItem.id}
                          isCurrent={
                            (subItem.href && currentSubpage === subItem.href) ||
                            (!currentSubpage && subItem.href === currentPage)
                          }
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
              label="More" // TODO: translate
              persistent
              trigger={
                <SideNav.PrimaryMenuItem
                  data-test-subj="sideNavMoreMenuItem"
                  isCurrent={overflowMenuItems.some((item) => item.id === sidePanelContent?.id)}
                  isCollapsed={isCollapsed}
                  iconType="boxesHorizontal"
                  hasContent
                  href=""
                  id="more-menu"
                  label="More" // TODO: translate
                >
                  {/* TODO: translate */}
                  More
                </SideNav.PrimaryMenuItem>
              }
            >
              {(closePopover) =>
                isCollapsed ? (
                  <NestedSecondaryMenu>
                    <NestedSecondaryMenu.Panel id="main" title="More">
                      <NestedSecondaryMenu.Section hasGap label={null}>
                        {overflowMenuItems.map((item) => {
                          const isCurrent =
                            item.href === currentPage || item.href === currentSubpage;
                          const hasSubItems = getHasSubmenu(item);

                          return (
                            <NestedSecondaryMenu.PrimaryMenuItem
                              key={item.id}
                              isCurrent={isCurrent}
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
                                isCurrent={
                                  (subItem.href && currentSubpage === subItem.href) ||
                                  (!currentSubpage && subItem.href === currentPage)
                                }
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
                  <SecondaryMenu title="More">
                    <SecondaryMenu.Section hasGap label={null}>
                      {overflowMenuItems.map((item) => {
                        const isCurrent = item.href === currentPage || item.href === currentSubpage;

                        return (
                          <SideNav.PrimaryMenuItem
                            key={item.id}
                            isCurrent={isCurrent}
                            isCollapsed={isCollapsed}
                            hasContent
                            onClick={() => {
                              navigateTo(item);
                              closePopover();
                              focusMainContent();
                            }}
                            horizontal
                            {...item}
                          >
                            {item.label}
                          </SideNav.PrimaryMenuItem>
                        );
                      })}
                    </SecondaryMenu.Section>
                  </SecondaryMenu>
                )
              }
            </SideNav.Popover>
          )}
        </SideNav.PrimaryMenu>

        <SideNav.Footer isCollapsed={isCollapsed}>
          {items.footerItems.slice(0, FOOTER_ITEM_LIMIT).map((item) => (
            <SideNav.Popover
              key={item.id}
              hasContent={getHasSubmenu(item)}
              isSidePanelOpen={!isCollapsed && item.id === sidePanelContent?.id}
              label={item.label}
              persistent={false}
              container={document.documentElement}
              trigger={
                <SideNav.FooterItem
                  isCurrent={item.id === sidePanelContent?.id}
                  onClick={() => navigateTo(item)}
                  hasContent={getHasSubmenu(item)}
                  onKeyDown={(e) => handleFooterItemKeyDown(item, e)}
                  {...item}
                />
              }
            >
              {(closePopover) => (
                <SecondaryMenu title={item.label}>
                  {item.sections?.map((section) => (
                    <SecondaryMenu.Section key={section.id} label={section.label}>
                      {section.items.map((subItem) => (
                        <SecondaryMenu.Item
                          key={subItem.id}
                          isCurrent={
                            (subItem.href && currentSubpage === subItem.href) ||
                            (!currentSubpage && subItem.href === currentPage)
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
          <SecondaryMenu title={sidePanelContent.label} isPanel>
            {sidePanelContent.sections?.map((section) => (
              <SecondaryMenu.Section key={section.id} label={section.label}>
                {section.items.map((subItem) => (
                  <SecondaryMenu.Item
                    key={subItem.id}
                    isCurrent={
                      (subItem.href && currentSubpage === subItem.href) ||
                      (!currentSubpage && subItem.href === currentPage)
                    }
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
    </>
  );
};
