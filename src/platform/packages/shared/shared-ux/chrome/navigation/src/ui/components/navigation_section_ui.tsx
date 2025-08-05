/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC, useMemo, useEffect, useState, useCallback } from 'react';
import { css } from '@emotion/react';
import {
  EuiTitle,
  EuiCollapsibleNavItem,
  EuiSpacer,
  type EuiCollapsibleNavItemProps,
  type EuiCollapsibleNavSubItemProps,
} from '@elastic/eui';
import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import classnames from 'classnames';
import type { EuiThemeSize, RenderAs } from '@kbn/core-chrome-browser/src/project_navigation';

import { SubItemTitle } from './subitem_title';
import { useNavigation as useServices } from '../../services';
import { isAbsoluteLink, isActiveFromUrl, isAccordionNode } from '../../utils';
import type { BasePathService, NavigateToUrlFn } from '../../types';
import { useNavigation } from '../navigation';
import { EventTracker } from '../../analytics';
import { useAccordionState } from '../hooks';
import {
  DEFAULT_IS_COLLAPSIBLE,
  DEFAULT_RENDER_AS,
  DEFAULT_SPACE_BETWEEN_LEVEL_1_GROUPS,
} from '../constants';
import type { EuiCollapsibleNavSubItemPropsEnhanced } from '../types';
import { PanelContext, usePanel } from './panel';
import { NavigationItemOpenPanel } from './navigation_item_open_panel';

const nodeHasLink = (navNode: ChromeProjectNavigationNode) =>
  Boolean(navNode.deepLink) || Boolean(navNode.href);

const nodeHasChildren = (navNode: ChromeProjectNavigationNode) => Boolean(navNode.children?.length);

/** Predicate to determine if a node should be visible in the main side nav.*/
const itemIsVisible = (item: ChromeProjectNavigationNode) => {
  if (item.sideNavStatus === 'hidden') return false;

  if (item.renderItem) return true;

  if (nodeHasLink(item)) return true;

  if (nodeHasChildren(item)) {
    return item.renderAs === 'item' ? true : item.children!.some(itemIsVisible);
  }

  return false;
};

const getRenderAs = (
  navNode: ChromeProjectNavigationNode,
  { isSideNavCollapsed }: { isSideNavCollapsed: boolean }
): RenderAs => {
  if (isSideNavCollapsed && navNode.renderAs === 'panelOpener') return 'accordion'; // When the side nav is collapsed, we render panel openers as accordions
  if (navNode.renderAs) return navNode.renderAs;
  if (!navNode.children) return 'item';
  return DEFAULT_RENDER_AS;
};

const getSpaceBefore = (
  navNode: ChromeProjectNavigationNode,
  {
    isSideNavCollapsed,
    treeDepth,
    parentNode,
  }: { isSideNavCollapsed: boolean; treeDepth: number; parentNode?: ChromeProjectNavigationNode }
): EuiThemeSize | null | undefined => {
  const hasChildren = nodeHasChildren(navNode);
  const isItem = navNode.renderAs === 'item';

  if (navNode.spaceBefore === undefined && treeDepth === 1 && hasChildren && !isItem) {
    // For groups at level 1 that don't have a space specified we default to add a "m"
    // space. For all other groups, unless specified, there is no vertical space.
    return DEFAULT_SPACE_BETWEEN_LEVEL_1_GROUPS;
  }

  if (
    isSideNavCollapsed &&
    navNode.renderAs === 'block' &&
    !!navNode.title &&
    parentNode?.renderAs === 'accordion'
  ) {
    // When the side nav is collapsed we control the spacing between groups inside accordions
    // for consistency and don't allow custom spacing to be set.
    return DEFAULT_SPACE_BETWEEN_LEVEL_1_GROUPS;
  }

  return navNode.spaceBefore;
};

const getTestSubj = (navNode: ChromeProjectNavigationNode, isActive = false): string => {
  const { id, path, deepLink } = navNode;
  return classnames(`nav-item`, `nav-item-${path}`, {
    [`nav-item-deepLinkId-${deepLink?.id}`]: !!deepLink,
    [`nav-item-id-${id}`]: id,
    [`nav-item-isActive`]: isActive,
  });
};

export const serializeNavNode = (
  navNode: ChromeProjectNavigationNode,
  {
    isSideNavCollapsed,
    treeDepth,
    parentNode,
  }: { isSideNavCollapsed: boolean; treeDepth: number; parentNode?: ChromeProjectNavigationNode }
) => {
  const serialized: ChromeProjectNavigationNode = {
    ...navNode,
  };
  serialized.renderAs = getRenderAs(serialized, { isSideNavCollapsed });
  serialized.spaceBefore = getSpaceBefore(serialized, {
    isSideNavCollapsed,
    treeDepth,
    parentNode,
  });
  serialized.children = navNode.children?.filter(itemIsVisible).map((child) =>
    serializeNavNode(child, {
      isSideNavCollapsed,
      treeDepth: treeDepth + 1,
      parentNode: serialized,
    })
  );

  return serialized;
};

const isEuiCollapsibleNavItemProps = (
  props: EuiCollapsibleNavItemProps | EuiCollapsibleNavSubItemProps
): props is EuiCollapsibleNavItemProps => {
  // collapsible nav item should not have renderItem
  if ('renderItem' in props) {
    return false;
  }

  if (!(props.title || props.items?.length)) {
    // title is not needed if nav item has sub-items
    return false;
  }

  return true;
};

const renderBlockTitle: (
  navNode: ChromeProjectNavigationNode
) => Required<EuiCollapsibleNavSubItemProps>['renderItem'] = (navNode) => () => {
  const { title, spaceBefore } = navNode;
  const dataTestSubj = getTestSubj(navNode);
  return (
    <EuiTitle
      size="xxxs"
      className="eui-textTruncate"
      data-test-subj={dataTestSubj}
      css={({ euiTheme }) => {
        return {
          marginTop: spaceBefore ? euiTheme.size[spaceBefore] : undefined,
          paddingBlock: euiTheme.size.xs,
          paddingInline: euiTheme.size.s,
        };
      }}
    >
      <div>{title}</div>
    </EuiTitle>
  );
};

const renderGroup = (
  navGroup: ChromeProjectNavigationNode,
  groupItems: Array<EuiCollapsibleNavItemProps | EuiCollapsibleNavSubItemPropsEnhanced>
): Required<EuiCollapsibleNavItemProps>['items'] => {
  let itemPrepend: EuiCollapsibleNavItemProps | EuiCollapsibleNavSubItemProps | null = null;
  const { spaceBefore } = navGroup;

  if (!!navGroup.title) {
    itemPrepend = {
      renderItem: renderBlockTitle(navGroup),
    };
  } else if (spaceBefore) {
    itemPrepend = {
      renderItem: () => <EuiSpacer size={spaceBefore} />,
    };
  }

  if (!itemPrepend) {
    return groupItems;
  }

  return [itemPrepend, ...groupItems];
};

const renderPanelOpener = (
  navGroup: ChromeProjectNavigationNode,
  {
    navigateToUrl,
    activeNodes,
  }: {
    navigateToUrl: NavigateToUrlFn;
    activeNodes: ChromeProjectNavigationNode[][];
  }
): Required<EuiCollapsibleNavItemProps>['items'] => {
  const items: EuiCollapsibleNavSubItemPropsEnhanced[] = [
    {
      renderItem: () => (
        <NavigationItemOpenPanel
          item={navGroup}
          navigateToUrl={navigateToUrl}
          activeNodes={activeNodes}
        />
      ),
    },
  ];

  if (navGroup.spaceBefore) {
    items.unshift({
      renderItem: () => <EuiSpacer size={navGroup.spaceBefore!} />,
    });
  }

  return items;
};

const getEuiProps = (
  navNode: ChromeProjectNavigationNode,
  deps: {
    navigateToUrl: NavigateToUrlFn;
    closePanel: PanelContext['close'];
    treeDepth: number;
    getIsCollapsed: (path: string) => boolean;
    activeNodes: ChromeProjectNavigationNode[][];
    eventTracker: EventTracker;
    basePath: BasePathService;
  }
): {
  navNode: ChromeProjectNavigationNode;
  subItems: EuiCollapsibleNavItemProps['items'];
  isSelected: boolean;
  isItem: boolean;
  dataTestSubj: string;
} & Pick<EuiCollapsibleNavItemProps, 'linkProps' | 'onClick'> => {
  const {
    navigateToUrl,
    closePanel,
    treeDepth,
    getIsCollapsed,
    activeNodes,
    eventTracker,
    basePath,
  } = deps;
  const hasLink = nodeHasLink(navNode);
  const isItem = navNode.renderAs === 'item';
  const { path, href, onClick: customOnClick, isCollapsible = DEFAULT_IS_COLLAPSIBLE } = navNode;

  const isAccordion = isAccordionNode(navNode);
  // If the node is an accordion and it is not collapsible, we only want to mark it as active
  // if it is the highest match in the URL, not if one of its children is also active.
  const onlyIfHighestMatch = isAccordion && !isCollapsible;
  const isActive = isActiveFromUrl(navNode.path, activeNodes, onlyIfHighestMatch);
  const isExternal = Boolean(href) && navNode.isExternalLink && isAbsoluteLink(href!);
  const isAccordionExpanded = !getIsCollapsed(path);

  let isSelected = isActive;
  if (isAccordion && isAccordionExpanded) {
    // For accordions that are collapsible, we don't want to mark the parent button as selected
    // when it is expanded. If the accordion is **not** collapsible then we do.
    isSelected = isCollapsible ? false : isActive;
  }

  const dataTestSubj = getTestSubj(navNode, isSelected);

  const subItems: EuiCollapsibleNavItemProps['items'] | undefined = isItem
    ? undefined
    : navNode.children
        ?.map((child) =>
          // Recursively convert the children to EuiCollapsibleNavSubItemProps
          nodeToEuiCollapsibleNavProps(child, { ...deps, treeDepth: treeDepth + 1 })
        )
        .filter(({ isVisible }) => isVisible)
        .map((res) => {
          const itemsFlattened: EuiCollapsibleNavItemProps['items'] = res.items.flat();
          return itemsFlattened;
        })
        .flat();

  /**
   * Check if the click event is a special click (e.g. right click, click with modifier key)
   * We do not want to prevent the default behavior in these cases.
   */
  const isSpecialClick = (e: React.MouseEvent<HTMLElement | HTMLButtonElement>) => {
    const isModifiedEvent = !!(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey);
    const isLeftClickEvent = e.button === 0;
    return isModifiedEvent || !isLeftClickEvent;
  };

  const linkProps: EuiCollapsibleNavItemProps['linkProps'] | undefined = hasLink
    ? {
        href,
        external: isExternal,
        onClick: (e) => {
          if (href) {
            eventTracker.clickNavLink({
              href: basePath.remove(href),
              id: navNode.id,
              hrefPrev: basePath.remove(window.location.pathname),
            });
          }

          if (customOnClick) {
            customOnClick(e);
            return;
          }

          if (isSpecialClick(e)) {
            return;
          }

          if (href) {
            e.preventDefault();
            navigateToUrl(href);
          }
        },
      }
    : undefined;

  const onClick = (e: React.MouseEvent<HTMLElement | HTMLButtonElement>) => {
    if (href) {
      eventTracker.clickNavLink({
        href: basePath.remove(href),
        id: navNode.id,
        hrefPrev: basePath.remove(window.location.pathname),
      });
    }

    if (customOnClick) {
      customOnClick(e);
      return;
    }

    // Do not navigate if it is a collapsible accordion, if there is a "link" defined it
    // will be used in the breadcrumb navigation.
    if (isAccordion && isCollapsible) return;

    if (isSpecialClick(e)) {
      return;
    }

    if (href !== undefined) {
      e.preventDefault();
      navigateToUrl(href);
      closePanel();
      return;
    }
  };

  return {
    navNode,
    subItems,
    isSelected,
    isItem,
    dataTestSubj,
    linkProps,
    onClick,
  };
};

// Generate the EuiCollapsible props for the root component (EuiCollapsibleNavItem) and its
// "items" props (recursively). Both are compatible with the exception of `renderItem` which
// can only be used for sub items (not top level).
function nodeToEuiCollapsibleNavProps(
  _navNode: ChromeProjectNavigationNode,
  deps: {
    navigateToUrl: NavigateToUrlFn;
    closePanel: PanelContext['close'];
    treeDepth: number;
    getIsCollapsed: (path: string) => boolean;
    activeNodes: ChromeProjectNavigationNode[][];
    eventTracker: EventTracker;
    basePath: BasePathService;
  }
): {
  items: Array<EuiCollapsibleNavItemProps | EuiCollapsibleNavSubItemPropsEnhanced>;
  isVisible: boolean;
} {
  const { navNode, subItems, dataTestSubj, isSelected, isItem, linkProps, onClick } = getEuiProps(
    _navNode,
    deps
  );
  const { id, path, href, renderAs, isCollapsible, spaceBefore, isExternalLink } = navNode;

  if (navNode.renderItem) {
    // Leave the rendering to the consumer
    return {
      items: [{ renderItem: navNode.renderItem }],
      isVisible: true,
    };
  }

  const hasVisibleSubItems = subItems && subItems.length > 0;

  if (renderAs === 'panelOpener' && hasVisibleSubItems) {
    // Render as a panel opener (button to open a panel as a second navigation)
    return {
      items: [...renderPanelOpener(navNode, deps)],
      isVisible: true,
    };
  }

  if (renderAs === 'block' && deps.treeDepth > 0 && hasVisibleSubItems) {
    // Render as a group block (bold title + list of links underneath)
    return {
      items: [...renderGroup(navNode, subItems)],
      isVisible: subItems.length > 0,
    };
  }

  // Render as a link or an accordion
  const items: Array<EuiCollapsibleNavItemProps | EuiCollapsibleNavSubItemPropsEnhanced> = [
    {
      id,
      path,
      isSelected,
      onClick,
      icon: navNode.icon,
      // @ts-expect-error title accepts JSX elements and they render correctly but the type definition expects a string
      title: navNode.withBadge ? <SubItemTitle item={navNode} /> : navNode.title,
      ['data-test-subj']: dataTestSubj,
      iconProps: { size: deps.treeDepth === 0 ? 'm' : 's' },

      // If navNode has subItems, render as an accordion.
      // Otherwise render as a link.
      // NavItemProp declarations are handled by us, rendering is handled by EUI.
      ...(hasVisibleSubItems
        ? { items: subItems, isCollapsible }
        : { href, ...linkProps, external: isExternalLink }),
    },
  ];

  const hasVisibleChildren = (items?.length ?? 0) > 0;
  const isVisible = isItem || hasVisibleChildren;

  if (isVisible && Boolean(spaceBefore)) {
    items.unshift({
      renderItem: () => <EuiSpacer size={spaceBefore!} />,
    });
  }

  return { items, isVisible };
}

interface Props {
  navNode: ChromeProjectNavigationNode;
}

export const NavigationSectionUI: FC<Props> = React.memo(({ navNode: _navNode }) => {
  const { activeNodes } = useNavigation();
  const { navigateToUrl, eventTracker, basePath, isSideNavCollapsed } = useServices();
  const [items, setItems] = useState<EuiCollapsibleNavSubItemProps[] | undefined>();

  const navNode = useMemo(
    () =>
      serializeNavNode(
        {
          renderAs: _navNode.children ? 'accordion' : 'item', // Top level nodes are either item or accordion
          ..._navNode,
        },
        { isSideNavCollapsed, treeDepth: 0 }
      ),
    [_navNode, isSideNavCollapsed]
  );
  const { close: closePanel } = usePanel();

  const { getIsCollapsed, getAccordionProps } = useAccordionState({ navNode });

  const {
    items: [props],
    isVisible,
  } = useMemo(() => {
    return nodeToEuiCollapsibleNavProps(navNode, {
      navigateToUrl,
      closePanel,
      treeDepth: 0,
      getIsCollapsed,
      activeNodes,
      eventTracker,
      basePath,
    });
  }, [navNode, navigateToUrl, closePanel, getIsCollapsed, activeNodes, eventTracker, basePath]);
  const { items: topLevelItems } = props;

  // Serializer to add recursively the accordionProps to each of the items
  // that will control its "open"/"closed" state + handler to toggle the state.
  const serializeAccordionItems = useCallback(
    (
      _items?: EuiCollapsibleNavSubItemPropsEnhanced[]
    ): EuiCollapsibleNavSubItemProps[] | undefined => {
      if (!_items) return;

      return _items.map(({ path, ...item }) => {
        if (item.renderItem) {
          return item;
        }

        const subItems: EuiCollapsibleNavSubItemProps['items'] = serializeAccordionItems(
          item.items
        );

        const accordionProps =
          subItems === undefined
            ? undefined
            : getAccordionProps(path ?? item.id!, {
                onClick: item.onClick,
                ...item.accordionProps,
              });

        // The EuiCollapsibleNavSubItemProps can have *either* href/linkProps or items/accordionProps/isCollapsible. Mixing them is not allowed
        // See ExclusiveUnion type in EUI repo at eui/src/components/collapsible_nav_beta/collapsible_nav_item/collapsible_nav_item.tsx#L63-L102
        const {
          href,
          linkProps,
          isCollapsible,
          items: __items,
          accordionProps: __accordionProps,
          ...rest
        } = item;

        const parsed: EuiCollapsibleNavSubItemProps = subItems
          ? {
              ...rest,
              items: subItems,
              accordionProps,
              isCollapsible,
            }
          : {
              ...rest,
              href,
              linkProps,
            };

        return parsed;
      });
    },
    [getAccordionProps]
  );

  useEffect(() => {
    setItems(serializeAccordionItems(topLevelItems));
  }, [topLevelItems, serializeAccordionItems]);

  if (!isEuiCollapsibleNavItemProps(props)) {
    throw new Error(`Invalid EuiCollapsibleNavItem props for node ${_navNode.id}`);
  }

  if (!isVisible) {
    return null;
  }

  const navItemStyles = css`
    .euiAccordion__childWrapper {
      transition: none; // Remove the transition as it does not play well with dynamic links added to the accordion
    }
  `;

  if (!items) {
    return <EuiCollapsibleNavItem {...props} css={navItemStyles} />;
  }

  // Item type ExclusiveUnion - accordions should not contain links
  const { href, linkProps, ...rest } = props;

  return (
    <EuiCollapsibleNavItem
      {...rest}
      css={navItemStyles}
      items={items}
      accordionProps={getAccordionProps(navNode.path)}
    />
  );
});
