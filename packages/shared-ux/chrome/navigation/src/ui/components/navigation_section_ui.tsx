/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';

import {
  EuiTitle,
  EuiCollapsibleNavItem,
  EuiSpacer,
  type EuiAccordionProps,
  type EuiCollapsibleNavItemProps,
  type EuiCollapsibleNavSubItemProps,
} from '@elastic/eui';
import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import classnames from 'classnames';
import type { EuiThemeSize, RenderAs } from '@kbn/core-chrome-browser/src/project_navigation';

import type { NavigateToUrlFn } from '../../../types/internal';
import { useNavigation as useServices } from '../../services';
import { nodePathToString, isAbsoluteLink, getNavigationNodeHref } from '../../utils';
import { PanelContext, usePanel } from './panel';
import { NavigationItemOpenPanel } from './navigation_item_open_panel';

const nodeHasLink = (navNode: ChromeProjectNavigationNode) =>
  Boolean(navNode.deepLink) || Boolean(navNode.href);

const nodeHasChildren = (navNode: ChromeProjectNavigationNode) => Boolean(navNode.children?.length);

const DEFAULT_SPACE_BETWEEN_LEVEL_1_GROUPS: EuiThemeSize = 'm';

/**
 * Predicate to determine if a node should be visible in the main side nav.
 * If it is not visible it will be filtered out and not rendered.
 */
const itemIsVisible = (item: ChromeProjectNavigationNode) => {
  if (item.sideNavStatus === 'hidden') return false;

  if (nodeHasLink(item)) {
    return true;
  }

  if (nodeHasChildren(item)) {
    return item.renderAs === 'item' ? true : item.children!.some(itemIsVisible);
  }

  return false;
};

const getRenderAs = (navNode: ChromeProjectNavigationNode): RenderAs => {
  if (navNode.renderAs) return navNode.renderAs;
  if (!navNode.children) return 'item';
  return 'block';
};

const filterChildren = (
  children?: ChromeProjectNavigationNode[]
): ChromeProjectNavigationNode[] | undefined => {
  if (!children) return undefined;
  return children.filter(itemIsVisible);
};

const serializeNavNode = (navNode: ChromeProjectNavigationNode) => {
  const serialized: ChromeProjectNavigationNode = {
    ...navNode,
    id: nodePathToString(navNode),
    children: filterChildren(navNode.children),
    href: getNavigationNodeHref(navNode),
  };

  serialized.renderAs = getRenderAs(serialized);

  return {
    navNode: serialized,
    hasChildren: nodeHasChildren(serialized),
    hasLink: nodeHasLink(serialized),
    isItem: serialized.renderAs === 'item' || serialized.children === undefined,
  };
};

const isEuiCollapsibleNavItemProps = (
  props: EuiCollapsibleNavItemProps | EuiCollapsibleNavSubItemProps
): props is EuiCollapsibleNavItemProps => {
  return (
    props.title !== undefined && (props as EuiCollapsibleNavSubItemProps).renderItem === undefined
  );
};

const renderBlockTitle: (
  { title }: ChromeProjectNavigationNode,
  { spaceBefore }: { spaceBefore: EuiThemeSize | null }
) => Required<EuiCollapsibleNavSubItemProps>['renderItem'] =
  ({ title }, { spaceBefore }) =>
  () =>
    (
      <EuiTitle
        size="xxxs"
        className="eui-textTruncate"
        css={({ euiTheme }: any) => {
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

const renderGroup = (
  navGroup: ChromeProjectNavigationNode,
  groupItems: Array<EuiCollapsibleNavItemProps | EuiCollapsibleNavSubItemProps>,
  { spaceBefore = DEFAULT_SPACE_BETWEEN_LEVEL_1_GROUPS }: { spaceBefore?: EuiThemeSize | null } = {}
): Required<EuiCollapsibleNavItemProps>['items'] => {
  let itemPrepend: EuiCollapsibleNavItemProps | EuiCollapsibleNavSubItemProps | null = null;

  if (!!navGroup.title) {
    itemPrepend = {
      renderItem: renderBlockTitle(navGroup, { spaceBefore }),
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

// Generate the EuiCollapsible props for both the root component (EuiCollapsibleNavItem) and its
// "items" props. Both are compatible with the exception of "renderItem" which is only used for
// sub items.
const nodeToEuiCollapsibleNavProps = (
  _navNode: ChromeProjectNavigationNode,
  {
    navigateToUrl,
    openPanel,
    closePanel,
    isSideNavCollapsed,
    treeDepth,
  }: {
    navigateToUrl: NavigateToUrlFn;
    openPanel: PanelContext['open'];
    closePanel: PanelContext['close'];
    isSideNavCollapsed: boolean;
    treeDepth: number;
  }
): {
  items: Array<EuiCollapsibleNavItemProps | EuiCollapsibleNavSubItemProps>;
  isVisible: boolean;
} => {
  const { navNode, isItem, hasChildren, hasLink } = serializeNavNode(_navNode);

  const {
    id,
    title,
    href,
    icon,
    renderAs,
    isActive,
    deepLink,
    spaceBefore: _spaceBefore,
  } = navNode;
  const isExternal = Boolean(href) && isAbsoluteLink(href!);
  const isSelected = hasChildren && !isItem ? false : isActive;
  const dataTestSubj = classnames(`nav-item`, `nav-item-${id}`, {
    [`nav-item-deepLinkId-${deepLink?.id}`]: !!deepLink,
    [`nav-item-id-${id}`]: id,
    [`nav-item-isActive`]: isSelected,
  });

  let spaceBefore = _spaceBefore;
  if (spaceBefore === undefined && treeDepth === 1 && hasChildren) {
    // For groups at level 1 that don't have a space specified we default to add a "m"
    // space. For all other groups, unless specified, there is no vertical space.
    spaceBefore = DEFAULT_SPACE_BETWEEN_LEVEL_1_GROUPS;
  }

  if (renderAs === 'panelOpener') {
    const items: EuiCollapsibleNavSubItemProps[] = [
      {
        renderItem: () => <NavigationItemOpenPanel item={navNode} navigateToUrl={navigateToUrl} />,
      },
    ];
    if (spaceBefore) {
      items.unshift({
        renderItem: () => <EuiSpacer size={spaceBefore!} />,
      });
    }
    return { items, isVisible: true };
  }

  const onClick = (e: React.MouseEvent) => {
    if (href !== undefined) {
      e.preventDefault();
      navigateToUrl(href);
      closePanel();
      return;
    }
  };

  const subItems: EuiCollapsibleNavItemProps['items'] | undefined = isItem
    ? undefined
    : navNode.children
        ?.map((child) =>
          nodeToEuiCollapsibleNavProps(child, {
            navigateToUrl,
            openPanel,
            closePanel,
            isSideNavCollapsed,
            treeDepth: treeDepth + 1,
          })
        )
        .filter(({ isVisible }) => isVisible)
        .map((res) => {
          const itemsFlattened: EuiCollapsibleNavItemProps['items'] = res.items.flat();
          return itemsFlattened;
        })
        .flat();

  const linkProps: EuiCollapsibleNavItemProps['linkProps'] | undefined = hasLink
    ? {
        href,
        external: isExternal,
        onClick: (e: React.MouseEvent) => {
          // TODO: here we might want to toggle the accordion (if we "renderAs: 'accordion'")
          // Will be done in following PR
          e.preventDefault();
          e.stopPropagation();
          if (href) {
            navigateToUrl(href);
          }
        },
      }
    : undefined;

  if (renderAs === 'block' && treeDepth > 0 && subItems) {
    // Render as a group block (bold title + list of links underneath)
    return {
      items: [...renderGroup(navNode, subItems, { spaceBefore: spaceBefore ?? null })],
      isVisible: subItems.length > 0,
    };
  }

  // Render as an accordion or a link (handled by EUI) depending if
  // "items" is undefined or not. If it is undefined --> a link, otherwise an
  // accordion is rendered.
  const items: Array<EuiCollapsibleNavItemProps | EuiCollapsibleNavSubItemProps> = [
    {
      id,
      title,
      isSelected,
      linkProps,
      onClick,
      href,
      items: subItems,
      ['data-test-subj']: dataTestSubj,
      icon,
      iconProps: { size: treeDepth === 0 ? 'm' : 's' },
    },
  ];

  const hasVisibleChildren = (items?.length ?? 0) > 0;
  const isVisible = isItem || hasVisibleChildren;

  if (isVisible && spaceBefore) {
    items.unshift({
      renderItem: () => <EuiSpacer size={spaceBefore!} />,
    });
  }

  return { items, isVisible };
};

const DEFAULT_IS_COLLAPSED = true;
const DEFAULT_IS_COLLAPSIBLE = true;

interface AccordionItemState {
  [key: string]: {
    isCollapsible: boolean;
    isCollapsed: boolean;
    // We want to auto expand the group automatically if the node is active (URL match)
    // but once the user manually expand a group we don't want to close it afterward automatically.
    doCollapseFromActiveState: boolean;
  };
}

interface Props {
  navNode: ChromeProjectNavigationNode;
}

export const NavigationSectionUI: FC<Props> = ({ navNode }) => {
  const { navigateToUrl, isSideNavCollapsed } = useServices();
  const { open: openPanel, close: closePanel } = usePanel();

  const navNodesById = useMemo(() => {
    const byId = {
      [nodePathToString(navNode)]: navNode,
    };

    const parse = (navNodes?: ChromeProjectNavigationNode[]) => {
      if (!navNodes) return;
      navNodes.forEach((childNode) => {
        byId[nodePathToString(childNode)] = childNode;
        parse(childNode.children);
      });
    };
    parse(navNode.children);

    return byId;
  }, [navNode]);

  const [navNodesState, setNavNodesState] = useState<AccordionItemState>(() => {
    return Object.entries(navNodesById).reduce<AccordionItemState>((acc, [_id, node]) => {
      if (node.children) {
        acc[_id] = {
          isCollapsed: !node.isActive ?? DEFAULT_IS_COLLAPSED,
          isCollapsible: node.isCollapsible ?? DEFAULT_IS_COLLAPSIBLE,
          doCollapseFromActiveState: true,
        };
      }
      return acc;
    }, {});
  });

  const [collapsibleNavSubItems, setCollapsibleNavSubItems] = useState<
    EuiCollapsibleNavSubItemProps[] | undefined
  >();

  const toggleAccordion = useCallback((id: string) => {
    setNavNodesState((prev) => {
      const prevValue = prev[id]?.isCollapsed ?? DEFAULT_IS_COLLAPSED;
      return {
        ...prev,
        [id]: {
          ...prev[id],
          isCollapsed: !prevValue,
          doCollapseFromActiveState: false, // once we manually toggle we don't want to auto-close it when URL changes
        },
      };
    });
  }, []);

  const setAccordionProps = useCallback(
    (
      id: string,
      _accordionProps?: Partial<EuiAccordionProps>
    ): Partial<EuiAccordionProps> | undefined => {
      const isCollapsed = navNodesState[id]?.isCollapsed ?? DEFAULT_IS_COLLAPSED;
      const isCollapsible = navNodesState[id]?.isCollapsible ?? DEFAULT_IS_COLLAPSIBLE;

      let forceState: EuiAccordionProps['forceState'] = isCollapsed ? 'closed' : 'open';
      if (!isCollapsible) forceState = 'open'; // Allways open if the accordion is not collapsible

      const updated: Partial<EuiAccordionProps> = {
        ..._accordionProps,
        ...(!isCollapsible && { arrowProps: { css: { display: 'none' } } }),
        forceState,
        onToggle: () => {
          toggleAccordion(id);
        },
      };

      return updated;
    },
    [navNodesState, toggleAccordion]
  );

  const { items, isVisible } = useMemo(() => {
    return nodeToEuiCollapsibleNavProps(navNode, {
      navigateToUrl,
      openPanel,
      closePanel,
      isSideNavCollapsed,
      treeDepth: 0,
    });
  }, [closePanel, isSideNavCollapsed, navNode, navigateToUrl, openPanel]);

  const [props] = items;
  const { items: accordionItems } = props;

  if (!isEuiCollapsibleNavItemProps(props)) {
    throw new Error(`Invalid EuiCollapsibleNavItem props for node ${props.id}`);
  }

  /**
   * Effect to set our internal state of each of the accordions (isCollapsed) based on the
   * "isActive" state of the navNode.
   */
  useEffect(() => {
    setNavNodesState((prev) => {
      return Object.entries(navNodesById).reduce<AccordionItemState>((acc, [_id, node]) => {
        if (node.children && (!prev[_id] || prev[_id].doCollapseFromActiveState)) {
          acc[_id] = {
            isCollapsed: !node.isActive ?? DEFAULT_IS_COLLAPSED,
            isCollapsible: node.isCollapsible ?? DEFAULT_IS_COLLAPSIBLE,
            doCollapseFromActiveState: true,
          };
        }
        return acc;
      }, prev);
    });
  }, [navNodesById]);

  useEffect(() => {
    // Serializer to add recursively the accordionProps to each of the items
    // that will control its "open"/"closed" state + handler to toggle the state.
    const serializeAccordionItems = (
      _items?: EuiCollapsibleNavSubItemProps[]
    ): EuiCollapsibleNavSubItemProps[] | undefined => {
      if (!_items) return;

      return _items.map((item: EuiCollapsibleNavSubItemProps) => {
        if (item.renderItem) {
          return item;
        }
        const parsed: EuiCollapsibleNavSubItemProps = {
          ...item,
          items: serializeAccordionItems(item.items),
          accordionProps: setAccordionProps(item.id!, item.accordionProps),
        };
        return parsed;
      });
    };

    setCollapsibleNavSubItems(serializeAccordionItems(accordionItems));
  }, [accordionItems, setAccordionProps]);

  if (!isVisible) {
    return null;
  }

  return (
    <EuiCollapsibleNavItem
      {...props}
      items={collapsibleNavSubItems}
      accordionProps={setAccordionProps(navNode.id)}
    />
  );
};
