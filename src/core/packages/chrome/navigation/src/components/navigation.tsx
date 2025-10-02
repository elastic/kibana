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
import type { NavigationStructure, SideNavLogo, MenuItem, SecondaryMenuItem } from '../../types';
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
   * Content to display inside the side panel footer.
   */
  sidePanelFooter?: React.ReactNode;
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
   * Callback fired when a navigation item is clicked.
   */
  onItemClick?: (item: MenuItem | SecondaryMenuItem | SideNavLogo) => void;
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
  onItemClick,
  setWidth,
  sidePanelFooter,
  ...rest
}: NavigationProps) => {
  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const isCollapsed = isMobile || isCollapsedProp;

  const {
    actualActiveItemId,
    visuallyActivePageId,
    visuallyActiveSubpageId,
    isSidePanelOpen,
    openerNode,
  } = useNavigation(isCollapsed, items, logo.id, activeItemId);

  const { overflowMenuItems, primaryMenuRef, visibleMenuItems } = useResponsiveMenu(
    isCollapsed,
    items.primaryItems
  );

  useLayoutWidth({ isCollapsed, isSidePanelOpen, setWidth });

  const handleFooterItemKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      // Required for entering the popover with Enter or Space key
      // Otherwise the navigation happens immediately
      e.preventDefault();
      focusMainContent();
    }
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
          isHighlighted={visuallyActivePageId === logo.id}
          isCurrent={actualActiveItemId === logo.id}
          isCollapsed={isCollapsed}
          onClick={() => onItemClick?.(logo)}
          {...logo}
        />

        <SideNav.PrimaryMenu ref={primaryMenuRef} isCollapsed={isCollapsed}>
          {visibleMenuItems.map((item) => {
            const { sections, ...itemProps } = item;
            return (
              <SideNav.Popover
                key={item.id}
                hasContent={getHasSubmenu(item)}
                isSidePanelOpen={!isCollapsed && item.id === openerNode?.id}
                label={item.label}
                trigger={
                  <SideNav.PrimaryMenuItem
                    isCollapsed={isCollapsed}
                    isHighlighted={item.id === visuallyActivePageId}
                    isCurrent={actualActiveItemId === item.id}
                    hasContent={getHasSubmenu(item)}
                    onClick={() => onItemClick?.(item)}
                    {...itemProps}
                  >
                    {item.label}
                  </SideNav.PrimaryMenuItem>
                }
              >
                {(closePopover) => (
                  <SecondaryMenu title={item.label} badgeType={item.badgeType}>
                    {sections?.map((section) => (
                      <SecondaryMenu.Section key={section.id} label={section.label}>
                        {section.items.map((subItem) => (
                          <SecondaryMenu.Item
                            key={subItem.id}
                            isHighlighted={subItem.id === visuallyActiveSubpageId}
                            isCurrent={actualActiveItemId === subItem.id}
                            onClick={() => {
                              onItemClick?.(subItem);
                              if (subItem.href) {
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
            );
          })}

          {overflowMenuItems.length > 0 && (
            <SideNav.Popover
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
                  isHighlighted={overflowMenuItems.some((item) => item.id === visuallyActivePageId)}
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
              {(closePopover) => (
                <NestedSecondaryMenu>
                  <NestedSecondaryMenu.Panel
                    id="main"
                    title={i18n.translate(
                      'core.ui.chrome.sideNavigation.nestedSecondaryMenuMoreTitle',
                      { defaultMessage: 'More' }
                    )}
                  >
                    <NestedSecondaryMenu.Section>
                      {overflowMenuItems.map((item) => {
                        const hasSubItems = getHasSubmenu(item);
                        const { sections, ...itemProps } = item;
                        return (
                          <NestedSecondaryMenu.PrimaryMenuItem
                            key={item.id}
                            isHighlighted={item.id === visuallyActivePageId}
                            isCollapsed={isCollapsed}
                            hasSubmenu={hasSubItems}
                            submenuPanelId={hasSubItems ? `submenu-${item.id}` : undefined}
                            onClick={() => {
                              onItemClick?.(item);
                              if (!hasSubItems) {
                                closePopover();
                                focusMainContent();
                              }
                            }}
                            {...itemProps}
                          >
                            {item.label}
                          </NestedSecondaryMenu.PrimaryMenuItem>
                        );
                      })}
                    </NestedSecondaryMenu.Section>
                  </NestedSecondaryMenu.Panel>
                  {overflowMenuItems.filter(getHasSubmenu).map((item) => (
                    <NestedSecondaryMenu.Panel key={`submenu-${item.id}`} id={`submenu-${item.id}`}>
                      <NestedSecondaryMenu.Header title={item.label} />
                      {item.sections?.map((section) => (
                        <NestedSecondaryMenu.Section key={section.id} label={section.label}>
                          {section.items.map((subItem) => (
                            <NestedSecondaryMenu.Item
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
                            </NestedSecondaryMenu.Item>
                          ))}
                        </NestedSecondaryMenu.Section>
                      ))}
                    </NestedSecondaryMenu.Panel>
                  ))}
                </NestedSecondaryMenu>
              )}
            </SideNav.Popover>
          )}
        </SideNav.PrimaryMenu>

        <SideNav.Footer isCollapsed={isCollapsed}>
          {items.footerItems.slice(0, MAX_FOOTER_ITEMS).map((item) => {
            const { sections, ...itemProps } = item;
            return (
              <SideNav.Popover
                key={item.id}
                hasContent={getHasSubmenu(item)}
                isSidePanelOpen={!isCollapsed && item.id === openerNode?.id}
                label={item.label}
                persistent={false}
                trigger={
                  <SideNav.FooterItem
                    isHighlighted={item.id === visuallyActivePageId}
                    isCurrent={actualActiveItemId === item.id}
                    hasContent={getHasSubmenu(item)}
                    onClick={() => onItemClick?.(item)}
                    onKeyDown={handleFooterItemKeyDown}
                    {...itemProps}
                  />
                }
              >
                {(closePopover) => (
                  <SecondaryMenu title={item.label} badgeType={item.badgeType}>
                    {sections?.map((section) => (
                      <SecondaryMenu.Section key={section.id} label={section.label}>
                        {section.items.map((subItem) => (
                          <SecondaryMenu.Item
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
            );
          })}
        </SideNav.Footer>
      </SideNav>

      {isSidePanelOpen && openerNode && (
        <SideNav.Panel footer={sidePanelFooter} openerNode={openerNode}>
          <SecondaryMenu badgeType={openerNode.badgeType} isPanel title={openerNode.label}>
            {openerNode.sections?.map((section) => (
              <SecondaryMenu.Section key={section.id} label={section.label}>
                {section.items.map((subItem) => (
                  <SecondaryMenu.Item
                    key={subItem.id}
                    isHighlighted={subItem.id === visuallyActiveSubpageId}
                    isCurrent={actualActiveItemId === subItem.id}
                    onClick={() => onItemClick?.(subItem)}
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
