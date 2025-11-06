/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useIsWithinBreakpoints } from '@elastic/eui';

import type { NavigationStructure, SideNavLogo, MenuItem, SecondaryMenuItem } from '../../types';
import { MAX_FOOTER_ITEMS } from '../constants';
import { SideNav } from './side_nav';
import { focusMainContent } from '../utils/focus_main_content';
import { getHasSubmenu } from '../utils/get_has_submenu';
import { useLayoutWidth } from '../hooks/use_layout_width';
import { useNavigation } from '../hooks/use_navigation';
import { useResponsiveMenu } from '../hooks/use_responsive_menu';

export interface NavigationProps {
  /**
   * The active path for the navigation, used for highlighting the current item.
   */
  activeItemId?: string;
  /**
   * Content to display inside the side panel footer.
   */
  sidePanelFooter?: ReactNode;
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

  const [isAnyPopoverOpen, setAnyPopoverOpen] = useState(false);

  const wrapperStyles = css`
    display: flex;
  `;

  return (
    <div
      css={wrapperStyles}
      data-test-subj={rest['data-test-subj'] ?? 'navigation-root'}
      id="navigation-root"
    >
      <SideNav isCollapsed={isCollapsed}>
        <SideNav.Logo
          isCollapsed={isCollapsed}
          isCurrent={actualActiveItemId === logo.id}
          isHighlighted={visuallyActivePageId === logo.id}
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
                isAnyPopoverOpen={isAnyPopoverOpen}
                isSidePanelOpen={!isCollapsed && item.id === openerNode?.id}
                label={item.label}
                setAnyPopoverOpen={setAnyPopoverOpen}
                trigger={
                  <SideNav.PrimaryMenu.Item
                    hasContent={getHasSubmenu(item)}
                    isCollapsed={isCollapsed}
                    isCurrent={actualActiveItemId === item.id}
                    isHighlighted={item.id === visuallyActivePageId}
                    onClick={() => onItemClick?.(item)}
                    {...itemProps}
                  >
                    {item.label}
                  </SideNav.PrimaryMenu.Item>
                }
              >
                {(closePopover) => (
                  <SideNav.SecondaryMenu title={item.label} badgeType={item.badgeType}>
                    {sections?.map((section) => (
                      <SideNav.SecondaryMenu.Section key={section.id} label={section.label}>
                        {section.items.map((subItem) => (
                          <SideNav.SecondaryMenu.Item
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
                          </SideNav.SecondaryMenu.Item>
                        ))}
                      </SideNav.SecondaryMenu.Section>
                    ))}
                  </SideNav.SecondaryMenu>
                )}
              </SideNav.Popover>
            );
          })}

          {overflowMenuItems.length > 0 && (
            <SideNav.Popover
              hasContent
              isAnyPopoverOpen={isAnyPopoverOpen}
              isSidePanelOpen={false}
              label={i18n.translate('core.ui.chrome.sideNavigation.moreMenuLabel', {
                defaultMessage: 'More',
              })}
              persistent
              setAnyPopoverOpen={setAnyPopoverOpen}
              trigger={
                <SideNav.PrimaryMenu.Item
                  data-test-subj="sideNavMoreMenuItem"
                  hasContent
                  iconType="boxesVertical"
                  id="more-menu"
                  isCollapsed={isCollapsed}
                  isHighlighted={overflowMenuItems.some((item) => item.id === visuallyActivePageId)}
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
                    id="main"
                    title={i18n.translate(
                      'core.ui.chrome.sideNavigation.nestedSecondaryMenuMoreTitle',
                      { defaultMessage: 'More' }
                    )}
                  >
                    <SideNav.NestedSecondaryMenu.Section>
                      {overflowMenuItems.map((item) => {
                        const hasSubmenu = getHasSubmenu(item);
                        const { sections, ...itemProps } = item;
                        return (
                          <SideNav.NestedSecondaryMenu.PrimaryMenuItem
                            key={item.id}
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
                  </SideNav.NestedSecondaryMenu.Panel>
                  {overflowMenuItems.filter(getHasSubmenu).map((item) => (
                    <SideNav.NestedSecondaryMenu.Panel key={`submenu-${item.id}`} id={item.id}>
                      <SideNav.NestedSecondaryMenu.Header title={item.label} />
                      {item.sections?.map((section) => (
                        <SideNav.NestedSecondaryMenu.Section key={section.id} label={section.label}>
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
                    </SideNav.NestedSecondaryMenu.Panel>
                  ))}
                </SideNav.NestedSecondaryMenu>
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
                isAnyPopoverOpen={isAnyPopoverOpen}
                isSidePanelOpen={!isCollapsed && item.id === openerNode?.id}
                label={item.label}
                persistent={false}
                setAnyPopoverOpen={setAnyPopoverOpen}
                trigger={
                  <SideNav.Footer.Item
                    isHighlighted={item.id === visuallyActivePageId}
                    isCurrent={actualActiveItemId === item.id}
                    hasContent={getHasSubmenu(item)}
                    onClick={() => onItemClick?.(item)}
                    {...itemProps}
                  />
                }
              >
                {(closePopover) => (
                  <SideNav.SecondaryMenu title={item.label} badgeType={item.badgeType}>
                    {sections?.map((section) => (
                      <SideNav.SecondaryMenu.Section key={section.id} label={section.label}>
                        {section.items.map((subItem) => (
                          <SideNav.SecondaryMenu.Item
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
                          </SideNav.SecondaryMenu.Item>
                        ))}
                      </SideNav.SecondaryMenu.Section>
                    ))}
                  </SideNav.SecondaryMenu>
                )}
              </SideNav.Popover>
            );
          })}
        </SideNav.Footer>
      </SideNav>

      {isSidePanelOpen && openerNode && (
        <SideNav.SidePanel footer={sidePanelFooter} openerNode={openerNode}>
          <SideNav.SecondaryMenu badgeType={openerNode.badgeType} isPanel title={openerNode.label}>
            {openerNode.sections?.map((section) => (
              <SideNav.SecondaryMenu.Section key={section.id} label={section.label}>
                {section.items.map((subItem) => (
                  <SideNav.SecondaryMenu.Item
                    key={subItem.id}
                    isCurrent={actualActiveItemId === subItem.id}
                    isHighlighted={subItem.id === visuallyActiveSubpageId}
                    onClick={() => onItemClick?.(subItem)}
                    testSubjPrefix="sidePanelItem"
                    {...subItem}
                  >
                    {subItem.label}
                  </SideNav.SecondaryMenu.Item>
                ))}
              </SideNav.SecondaryMenu.Section>
            ))}
          </SideNav.SecondaryMenu>
        </SideNav.SidePanel>
      )}
    </div>
  );
};
