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

const FOOTER_ITEM_LIMIT = 5;

interface NavigationProps {
  isCollapsed: boolean;
  items: NavigationStructure;
  logoLabel: string;
  logoType: string;
  setWidth: (width: number) => void;
}

export const Navigation = ({
  isCollapsed: isCollapsedProp,
  items,
  logoLabel,
  logoType,
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

  const focusMainContent = () => {
    const mainElement = document.querySelector('main#app-main-scroll');

    if (mainElement instanceof HTMLElement) {
      mainElement.focus();
    }
  };

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
    if (e.key === 'Enter') {
      e.preventDefault();
      navigateTo(item);
      focusMainContent();
    }
  };

  return (
    <>
      <SideNav isCollapsed={isCollapsed}>
        <SideNav.Logo isCollapsed={isCollapsed} label={logoLabel} logoType={logoType} />

        <SideNav.PrimaryMenu ref={primaryMenuRef} isCollapsed={isCollapsed}>
          {visibleMenuItems.map((item) => (
            <SideNav.Popover
              key={item.id}
              container={document.documentElement}
              hasContent={getHasSubmenu(item)}
              isSidePanelOpen={!isCollapsed && item.id === sidePanelContent?.id}
              trigger={
                <SideNav.PrimaryMenuItem
                  href={item.href}
                  iconType={item.iconType}
                  isCollapsed={isCollapsed}
                  isCurrent={item.id === sidePanelContent?.id}
                  hasContent={getHasSubmenu(item)}
                  onClick={() => handleMainItemClick(item)}
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
                          href={subItem.href}
                          onClick={() => {
                            if (subItem.href) {
                              handleSubMenuItemClick(item, subItem);
                              closePopover();
                            }
                          }}
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
              persistent
              trigger={
                <SideNav.PrimaryMenuItem
                  isCurrent={overflowMenuItems.some((item) => item.id === sidePanelContent?.id)}
                  isCollapsed={isCollapsed}
                  iconType="boxesHorizontal"
                  hasContent
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
                              iconType={item.iconType}
                              isCurrent={isCurrent}
                              isCollapsed={isCollapsed}
                              href={item.href}
                              hasSubmenu={hasSubItems}
                              submenuPanelId={hasSubItems ? `submenu-${item.id}` : undefined}
                              onClick={() => {
                                if (!hasSubItems) {
                                  navigateTo(item);
                                  closePopover();
                                  focusMainContent();
                                }
                              }}
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
                                iconType={subItem.iconType}
                                isCurrent={
                                  (subItem.href && currentSubpage === subItem.href) ||
                                  (!currentSubpage && subItem.href === currentPage)
                                }
                                href={subItem.href}
                                onClick={() => {
                                  navigateTo(item, subItem);
                                  closePopover();
                                  focusMainContent();
                                }}
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
                            iconType={item.iconType}
                            isCurrent={isCurrent}
                            isCollapsed={isCollapsed}
                            href={item.href}
                            hasContent
                            onClick={() => {
                              navigateTo(item);
                              closePopover();
                              focusMainContent();
                            }}
                            horizontal
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
              isSidePanelOpen={!isCollapsed && item.id === sidePanelContent?.id}
              hasContent={getHasSubmenu(item)}
              persistent={false}
              container={document.documentElement}
              trigger={
                <SideNav.FooterItem
                  isCurrent={item.id === sidePanelContent?.id}
                  onClick={() => navigateTo(item)}
                  hasContent={getHasSubmenu(item)}
                  onKeyDown={(e) => handleFooterItemKeyDown(item, e)}
                  label={item.label}
                  iconType={item.iconType}
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
                          href={subItem.href}
                          onClick={() => {
                            if (subItem.href) {
                              handleSubMenuItemClick(item, subItem);
                              closePopover();
                            }
                          }}
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
                    href={subItem.href}
                    onClick={() => {
                      if (subItem.href) {
                        handleSubMenuItemClick(sidePanelContent, subItem);
                      }
                    }}
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
