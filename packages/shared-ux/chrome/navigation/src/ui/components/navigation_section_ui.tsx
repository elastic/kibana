/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import useObservable from 'react-use/lib/useObservable';
import { css } from '@emotion/css';
import {
  EuiTitle,
  EuiCollapsibleNavItem,
  EuiSpacer,
  type EuiAccordionProps,
  type EuiCollapsibleNavItemProps,
  type EuiCollapsibleNavSubItemProps,
} from '@elastic/eui';
import type { ChromeProjectNavigationNode, ChromeNavLink } from '@kbn/core-chrome-browser';
import classnames from 'classnames';
import type { EuiThemeSize, RenderAs } from '@kbn/core-chrome-browser/src/project_navigation';

import type { NavigateToUrlFn } from '../../../types/internal';
import { useNavigation as useServices } from '../../services';
import { useNavigation } from './navigation';
import { nodePathToString, isAbsoluteLink, getNavigationNodeHref } from '../../utils';
import { PanelContext, usePanel } from './panel';
import { NavigationItemOpenPanel } from './navigation_item_open_panel';

const DEFAULT_SPACE_BETWEEN_LEVEL_1_GROUPS: EuiThemeSize = 'm';
const DEFAULT_IS_COLLAPSED = true;
const DEFAULT_IS_COLLAPSIBLE = true;

function isSamePath(pathA: string[] | null, pathB: string[] | null) {
  if (pathA === null || pathB === null) {
    return false;
  }
  const pathAToString = pathA.join('.');
  const pathBToString = pathB.join('.');
  return pathAToString === pathBToString;
}

const nodeHasLink = (navNode: ChromeProjectNavigationNode) =>
  Boolean(navNode.deepLink) || Boolean(navNode.href);

const nodeHasChildren = (navNode: ChromeProjectNavigationNode) => Boolean(navNode.children?.length);

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

const getTestSubj = (navNode: ChromeProjectNavigationNode, isActive = false): string => {
  const { id, deepLink } = navNode;
  return classnames(`nav-item`, `nav-item-${id}`, {
    [`nav-item-deepLinkId-${deepLink?.id}`]: !!deepLink,
    [`nav-item-id-${id}`]: id,
    [`nav-item-isActive`]: isActive,
  });
};

const filterChildren = (
  children?: ChromeProjectNavigationNode[]
): ChromeProjectNavigationNode[] | undefined => {
  if (!children) return undefined;
  return children.filter(itemIsVisible);
};

const isActiveFromUrl = (nodePath: string[], activeNodes: ChromeProjectNavigationNode[][]) => {
  return activeNodes.reduce((acc, nodesBranch) => {
    return acc === true ? acc : nodesBranch.some((branch) => isSamePath(branch.path, nodePath));
  }, false);
};

const serializeNavNode = (
  navNode: ChromeProjectNavigationNode,
  { activeNodes }: { activeNodes: ChromeProjectNavigationNode[][] }
) => {
  const href = getNavigationNodeHref(navNode);

  const serialized: ChromeProjectNavigationNode = {
    ...navNode,
    id: nodePathToString(navNode),
    children: filterChildren(navNode.children),
    isActive: navNode.isActive ?? isActiveFromUrl(navNode.path, activeNodes),
    href,
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
  navNode: ChromeProjectNavigationNode,
  { spaceBefore }: { spaceBefore: EuiThemeSize | null }
) => Required<EuiCollapsibleNavSubItemProps>['renderItem'] =
  (navNode, { spaceBefore }) =>
  () => {
    const { title } = navNode;
    const dataTestSubj = getTestSubj(navNode);
    return (
      <EuiTitle
        size="xxxs"
        className="eui-textTruncate"
        data-test-subj={dataTestSubj}
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
  };

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
    itemsState,
    activeNodes,
    deepLinks,
  }: {
    navigateToUrl: NavigateToUrlFn;
    openPanel: PanelContext['open'];
    closePanel: PanelContext['close'];
    isSideNavCollapsed: boolean;
    treeDepth: number;
    itemsState: AccordionItemsState;
    activeNodes: ChromeProjectNavigationNode[][];
    deepLinks: Readonly<ChromeNavLink[]>;
  }
): {
  items: Array<EuiCollapsibleNavItemProps | EuiCollapsibleNavSubItemProps>;
  isVisible: boolean;
} => {
  const { navNode, isItem, hasChildren, hasLink } = serializeNavNode(_navNode, {
    activeNodes,
  });

  const { id, title, href, icon, renderAs, isActive, spaceBefore: _spaceBefore } = navNode;
  const isExternal = Boolean(href) && isAbsoluteLink(href!);

  const isAccordion = hasChildren && !isItem;
  const isAccordionExpanded = (itemsState[id]?.isCollapsed ?? DEFAULT_IS_COLLAPSED) === false;
  const isSelected = isAccordion && isAccordionExpanded ? false : isActive;

  const dataTestSubj = getTestSubj(navNode, isSelected);

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
            itemsState,
            activeNodes,
            deepLinks,
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

// Temporary solution to prevent showing the outline when the page load when the
// accordion is auto-expanded if one of its children is active
// Once https://github.com/elastic/eui/pull/7314 is released in Kibana we can
// safely remove this CSS class.
const className = css`
  .euiAccordion__childWrapper,
  .euiAccordion__children,
  .euiCollapsibleNavAccordion__children {
    outline: none;
  }
`;

interface AccordionItemsState {
  [navNodeId: string]: {
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

export const NavigationSectionUI: FC<Props> = React.memo(({ navNode: _navNode }) => {
  const { activeNodes } = useNavigation();
  const { navigateToUrl, isSideNavCollapsed, navLinks$ } = useServices();
  const deepLinks = useObservable(navLinks$, []);

  const { navNode } = useMemo(
    () => serializeNavNode(_navNode, { activeNodes }),
    [_navNode, activeNodes]
  );
  const { open: openPanel, close: closePanel } = usePanel();

  const debug2 = useRef({ ...navNode });

  const navNodesById = useMemo(() => {
    console.log('Re-creating byId', navNode.id);
    Object.entries(debug2.current).forEach(([key, value]) => {
      console.log(key, value !== navNode[key]);
    });
    debug2.current = { ...navNode };
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

  const [itemsState, setItemsState] = useState<AccordionItemsState>(() => {
    return Object.entries(navNodesById).reduce<AccordionItemsState>((acc, [_id, node]) => {
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

  const [subItems, setSubItems] = useState<EuiCollapsibleNavSubItemProps[] | undefined>();

  const toggleAccordion = useCallback((id: string) => {
    setItemsState((prev) => {
      // if (prev[id]?.isCollapsed === undefined) return prev;
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
      const isCollapsed = itemsState[id]?.isCollapsed;
      const isCollapsible = itemsState[id]?.isCollapsible;

      if (isCollapsed === undefined) return _accordionProps; // No state set yet

      let forceState: EuiAccordionProps['forceState'] = isCollapsed ? 'closed' : 'open';
      if (!isCollapsible) forceState = 'open'; // Allways open if the accordion is not collapsible

      const arrowProps: EuiAccordionProps['arrowProps'] = {
        css: isCollapsible ? undefined : { display: 'none' },
        'data-test-subj': classNames(`accordionArrow`, `accordionArrow-${id}`),
      };

      const updated: Partial<EuiAccordionProps> = {
        ..._accordionProps,
        arrowProps,
        forceState,
        onToggle: () => {
          toggleAccordion(id);
        },
      };

      return updated;
    },
    [itemsState, toggleAccordion]
  );

  const { items, isVisible } = useMemo(() => {
    return nodeToEuiCollapsibleNavProps(navNode, {
      navigateToUrl,
      openPanel,
      closePanel,
      isSideNavCollapsed,
      treeDepth: 0,
      itemsState,
      activeNodes,
      deepLinks,
    });
  }, [
    navNode,
    navigateToUrl,
    openPanel,
    closePanel,
    isSideNavCollapsed,
    itemsState,
    activeNodes,
    deepLinks,
  ]);

  const [props] = items;
  const { items: accordionItems } = props;

  if (!isEuiCollapsibleNavItemProps(props)) {
    throw new Error(`Invalid EuiCollapsibleNavItem props for node ${props.id}`);
  }

  const debug = useRef({
    activeNodes,
    navNodesById,
  });

  /**
   * Effect to set our internal state of each of the accordions (isCollapsed) based on the
   * "isActive" state of the navNode.
   */
  useEffect(() => {
    console.log('activeNodes', activeNodes !== debug.current.activeNodes);
    console.log('navNodesById', navNodesById !== debug.current.navNodesById);
    debug.current = { activeNodes, navNodesById };
    setItemsState((prev) => {
      return Object.entries(navNodesById).reduce<AccordionItemsState>((acc, [_id, node]) => {
        if (node.children && (!prev[_id] || prev[_id].doCollapseFromActiveState)) {
          let nextIsActive = node.isActive;
          if (prev[_id]?.doCollapseFromActiveState === true) {
            nextIsActive = isActiveFromUrl(node.path, activeNodes);
          } else if (nextIsActive === undefined) {
            nextIsActive = !DEFAULT_IS_COLLAPSED;
          }

          // if ((!prev[_id] || prev[_id].doCollapseFromActiveState) && isActive === undefined) {
          //   isActive = isActiveFromUrl(node.path, activeNodes);
          // } else if (!prev[_id]) {
          //   isActive = !DEFAULT_IS_COLLAPSED;
          // }

          // console.log('Updating item state', _id, isActive);

          acc[_id] = {
            isCollapsed: !nextIsActive,
            isCollapsible: node.isCollapsible ?? DEFAULT_IS_COLLAPSIBLE,
            doCollapseFromActiveState: true,
          };
        }
        return acc;
      }, prev);
    });
  }, [navNodesById, activeNodes]);

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
          accordionProps:
            item.items !== undefined ? setAccordionProps(item.id!, item.accordionProps) : undefined,
        };
        return parsed;
      });
    };

    setSubItems(serializeAccordionItems(accordionItems));
  }, [accordionItems, setAccordionProps]);

  if (!isVisible) {
    return null;
  }

  return (
    <EuiCollapsibleNavItem
      {...props}
      className={className}
      items={subItems}
      accordionProps={setAccordionProps(navNode.id)}
    />
  );
});
