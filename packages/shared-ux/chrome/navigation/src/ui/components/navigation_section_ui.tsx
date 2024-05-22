/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { css } from '@emotion/css';
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

import { useNavigation as useServices } from '../../services';
import { isAbsoluteLink, isActiveFromUrl } from '../../utils';
import type { NavigateToUrlFn } from '../../types';
import { useNavigation } from '../navigation';
import { PanelContext, usePanel } from './panel';
import { NavigationItemOpenPanel } from './navigation_item_open_panel';

type EuiCollapsibleNavSubItemPropsEnhanced = EuiCollapsibleNavSubItemProps & { path?: string };

const DEFAULT_SPACE_BETWEEN_LEVEL_1_GROUPS: EuiThemeSize = 'm';
const DEFAULT_IS_COLLAPSED = true;
const DEFAULT_IS_COLLAPSIBLE = true;
const DEFAULT_RENDER_AS: RenderAs = 'block';

const nodeHasLink = (navNode: ChromeProjectNavigationNode) =>
  Boolean(navNode.deepLink) || Boolean(navNode.href);

const nodeHasChildren = (navNode: ChromeProjectNavigationNode) => Boolean(navNode.children?.length);

/**
 * Predicate to determine if a node should be visible in the main side nav.
 * If it is not visible it will be filtered out and not rendered.
 */
const itemIsVisible = (item: ChromeProjectNavigationNode) => {
  if (item.sideNavStatus === 'hidden') return false;

  if (item.renderItem) return true;

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
  return DEFAULT_RENDER_AS;
};

const getTestSubj = (navNode: ChromeProjectNavigationNode, isActive = false): string => {
  const { id, path, deepLink } = navNode;
  return classnames(`nav-item`, `nav-item-${path}`, {
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

const serializeNavNode = (navNode: ChromeProjectNavigationNode) => {
  const serialized: ChromeProjectNavigationNode = {
    ...navNode,
    children: filterChildren(navNode.children),
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
  groupItems: Array<EuiCollapsibleNavItemProps | EuiCollapsibleNavSubItemPropsEnhanced>,
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

const isAccordionNode = (
  node: Pick<ChromeProjectNavigationNode, 'renderAs' | 'defaultIsCollapsed' | 'isCollapsible'>
) =>
  node.renderAs === 'accordion' ||
  ['defaultIsCollapsed', 'isCollapsible'].some((prop) => node.hasOwnProperty(prop));

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
    itemsAccordionState,
    activeNodes,
  }: {
    navigateToUrl: NavigateToUrlFn;
    openPanel: PanelContext['open'];
    closePanel: PanelContext['close'];
    isSideNavCollapsed: boolean;
    treeDepth: number;
    itemsAccordionState: AccordionItemsState;
    activeNodes: ChromeProjectNavigationNode[][];
  }
): {
  items: Array<EuiCollapsibleNavItemProps | EuiCollapsibleNavSubItemPropsEnhanced>;
  isVisible: boolean;
} => {
  const { navNode, isItem, hasChildren, hasLink } = serializeNavNode(_navNode);
  const {
    id,
    path,
    href,
    renderAs,
    onClick: customOnClick,
    isCollapsible = DEFAULT_IS_COLLAPSIBLE,
  } = navNode;
  const isAccordion = isAccordionNode(navNode);

  // If the node is an accordion and it is not collapsible, we only want to mark it as active
  // if it is the highest match in the URL, not if one of its children is also active.
  const onlyIfHighestMatch = isAccordion && !isCollapsible;
  const isActive = isActiveFromUrl(navNode.path, activeNodes, onlyIfHighestMatch);
  const isExternal = Boolean(href) && !navNode.isElasticInternalLink && isAbsoluteLink(href!);
  const isAccordionExpanded =
    (itemsAccordionState[path]?.isCollapsed ?? DEFAULT_IS_COLLAPSED) === false;
  let isSelected = isActive;

  if (isAccordion && isAccordionExpanded) {
    // For accordions that are collapsible, we don't want to mark the parent button as selected
    // when it is expanded. If the accordion is **not** collapsible then we do.
    isSelected = isCollapsible ? false : isActive;
  }

  const dataTestSubj = getTestSubj(navNode, isSelected);

  let spaceBefore = navNode.spaceBefore;
  if (spaceBefore === undefined && treeDepth === 1 && hasChildren && !isItem) {
    // For groups at level 1 that don't have a space specified we default to add a "m"
    // space. For all other groups, unless specified, there is no vertical space.
    spaceBefore = DEFAULT_SPACE_BETWEEN_LEVEL_1_GROUPS;
  }

  if (renderAs === 'panelOpener') {
    const items: EuiCollapsibleNavSubItemPropsEnhanced[] = [
      {
        renderItem: () => (
          <NavigationItemOpenPanel
            item={navNode}
            navigateToUrl={navigateToUrl}
            activeNodes={activeNodes}
          />
        ),
      },
    ];
    if (spaceBefore) {
      items.unshift({
        renderItem: () => <EuiSpacer size={spaceBefore!} />,
      });
    }
    return { items, isVisible: true };
  }

  const onClick = (e: React.MouseEvent<HTMLElement | HTMLButtonElement>) => {
    if (customOnClick) {
      customOnClick(e);
      return;
    }

    // Do not navigate if it is a collapsible accordion, link will be used in the breadcrumb
    if (isAccordion && isCollapsible) return;

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
            itemsAccordionState,
            activeNodes,
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
        onClick: (e) => {
          if (customOnClick) {
            customOnClick(e);
            return;
          }

          if (href) {
            e.preventDefault();
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
  if (navNode.renderItem) {
    return {
      items: [
        {
          renderItem: navNode.renderItem,
        },
      ],
      isVisible: true,
    };
  }

  const items: Array<EuiCollapsibleNavItemProps | EuiCollapsibleNavSubItemPropsEnhanced> = [
    // @ts-ignore - TODO
    {
      id,
      path,
      isSelected,
      linkProps,
      onClick,
      href,
      icon: navNode.icon,
      title: navNode.title,
      items: subItems,
      ['data-test-subj']: dataTestSubj,
      iconProps: { size: treeDepth === 0 ? 'm' : 's' },
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
};

const className = css`
  .euiAccordion__childWrapper {
    transition: none; // Remove the transition as it does not play well with dynamic links added to the accordion
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
  const { navigateToUrl, isSideNavCollapsed } = useServices();

  const { navNode } = useMemo(
    () =>
      serializeNavNode({
        renderAs: 'accordion', // Top level nodes are always rendered as accordion
        ..._navNode,
      }),
    [_navNode]
  );
  const { open: openPanel, close: closePanel } = usePanel();

  const navNodesById = useMemo(() => {
    const byId = {
      [navNode.path]: navNode,
    };

    const parse = (navNodes?: ChromeProjectNavigationNode[]) => {
      if (!navNodes) return;
      navNodes.forEach((childNode) => {
        byId[childNode.path] = childNode;
        parse(childNode.children);
      });
    };
    parse(navNode.children);

    return byId;
  }, [navNode]);

  const [itemsAccordionState, setItemsAccordionState] = useState<AccordionItemsState>(() => {
    return Object.entries(navNodesById).reduce<AccordionItemsState>((acc, [_id, node]) => {
      if (isAccordionNode(node)) {
        let isCollapsed = DEFAULT_IS_COLLAPSED;
        let doCollapseFromActiveState = true;

        if (node.defaultIsCollapsed !== undefined) {
          isCollapsed = node.defaultIsCollapsed;
          doCollapseFromActiveState = false;
        }

        acc[_id] = {
          isCollapsed,
          isCollapsible: node.isCollapsible ?? DEFAULT_IS_COLLAPSIBLE,
          doCollapseFromActiveState,
        };
      }

      return acc;
    }, {});
  });

  const [subItems, setSubItems] = useState<EuiCollapsibleNavSubItemProps[] | undefined>();

  const toggleAccordion = useCallback((id: string) => {
    setItemsAccordionState((prev) => {
      const prevState = prev[id];
      const prevValue = prevState?.isCollapsed ?? DEFAULT_IS_COLLAPSED;
      const { isCollapsible } = prevState;
      return {
        ...prev,
        [id]: {
          ...prev[id],
          isCollapsed: !prevValue,
          doCollapseFromActiveState: isCollapsible
            ? // if the accordion is collapsible & the user has interacted with the accordion
              // we don't want to auto-close it when URL changes to not interfere with the user's choice
              false
            : // if the accordion is **not** collapsible we do want to auto-close it when the URL changes
              prevState.doCollapseFromActiveState,
        },
      };
    });
  }, []);

  const getAccordionProps = useCallback(
    (
      id: string,
      _accordionProps?: Partial<EuiAccordionProps>
    ): Partial<EuiAccordionProps> | undefined => {
      const isCollapsed = itemsAccordionState[id]?.isCollapsed;
      const isCollapsible = itemsAccordionState[id]?.isCollapsible;

      if (isCollapsed === undefined) return _accordionProps; // No state set yet

      let forceState: EuiAccordionProps['forceState'] = isCollapsed ? 'closed' : 'open';
      if (!isCollapsible) forceState = 'open'; // Allways open if the accordion is not collapsible

      const arrowProps: EuiAccordionProps['arrowProps'] = {
        css: isCollapsible ? undefined : { display: 'none' },
        'data-test-subj': classNames(`accordionArrow`, `accordionArrow-${id}`),
      };

      const updated: Partial<EuiAccordionProps & { isCollapsible?: boolean }> = {
        ..._accordionProps,
        arrowProps,
        isCollapsible,
        forceState,
        onToggle: isCollapsible
          ? () => {
              toggleAccordion(id);
            }
          : undefined,
      };

      return updated;
    },
    [itemsAccordionState, toggleAccordion]
  );

  const { items, isVisible } = useMemo(() => {
    return nodeToEuiCollapsibleNavProps(navNode, {
      navigateToUrl,
      openPanel,
      closePanel,
      isSideNavCollapsed,
      treeDepth: 0,
      itemsAccordionState,
      activeNodes,
    });
  }, [
    navNode,
    navigateToUrl,
    openPanel,
    closePanel,
    isSideNavCollapsed,
    itemsAccordionState,
    activeNodes,
  ]);

  const [props] = items;
  const { items: accordionItems } = props;

  if (!isEuiCollapsibleNavItemProps(props)) {
    throw new Error(`Invalid EuiCollapsibleNavItem props for node ${props.id}`);
  }

  /**
   * Effect to set the internal state of each of the accordions (isCollapsed) based on the
   * "isActive" state of the navNode or if its path matches the URL location
   */
  useEffect(() => {
    setItemsAccordionState((prev) => {
      return Object.entries(navNodesById).reduce<AccordionItemsState>(
        (acc, [_id, node]) => {
          const prevState = prev[_id];

          if (
            isAccordionNode(node) &&
            (!prevState || prevState.doCollapseFromActiveState === true)
          ) {
            let nextIsActive = false;
            let doCollapseFromActiveState = true;

            if (!prevState && node.defaultIsCollapsed !== undefined) {
              nextIsActive = !node.defaultIsCollapsed;
              doCollapseFromActiveState = false;
            } else {
              if (prevState?.doCollapseFromActiveState !== false) {
                nextIsActive = isActiveFromUrl(node.path, activeNodes);
              } else if (nextIsActive === undefined) {
                nextIsActive = !DEFAULT_IS_COLLAPSED;
              }
            }

            acc[_id] = {
              ...prevState,
              isCollapsed: !nextIsActive,
              isCollapsible: node.isCollapsible ?? DEFAULT_IS_COLLAPSIBLE,
              doCollapseFromActiveState,
            };
          }
          return acc;
        },
        { ...prev }
      );
    });
  }, [navNodesById, activeNodes]);

  useEffect(() => {
    // Serializer to add recursively the accordionProps to each of the items
    // that will control its "open"/"closed" state + handler to toggle the state.
    const serializeAccordionItems = (
      _items?: EuiCollapsibleNavSubItemPropsEnhanced[]
    ): EuiCollapsibleNavSubItemProps[] | undefined => {
      if (!_items) return;

      return _items.map((item) => {
        if (item.renderItem) {
          return item;
        }
        // @ts-ignore - TODO
        const parsed: EuiCollapsibleNavSubItemProps = {
          ...item,
          items: serializeAccordionItems(item.items),
          accordionProps:
            item.items !== undefined
              ? getAccordionProps(item.path ?? item.id!, {
                  onClick: item.onClick,
                  ...item.accordionProps,
                })
              : undefined,
        };
        return parsed;
      });
    };

    setSubItems(serializeAccordionItems(accordionItems));
  }, [accordionItems, getAccordionProps]);

  if (!isVisible) {
    return null;
  }

  return (
    // @ts-ignore - TODO
    <EuiCollapsibleNavItem
      {...props}
      className={className}
      items={subItems}
      accordionProps={getAccordionProps(navNode.path)}
    />
  );
});
