/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
import classNames from 'classnames';
import { type EuiAccordionProps } from '@elastic/eui';
import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';

import { isAccordionNode, isActiveFromUrl } from '../../utils';
import { DEFAULT_IS_COLLAPSED, DEFAULT_IS_COLLAPSIBLE } from '../constants';
import { useNavigation } from '../navigation';

export interface AccordionItemsState {
  [navNodeId: string]: {
    isCollapsible: boolean;
    isCollapsed: boolean;
    // We want to auto expand the group automatically if the node is active (URL match)
    // but once the user manually expand a group we don't want to close it afterward automatically.
    doCollapseFromActiveState: boolean;
  };
}

export const useAccordionState = ({ navNode }: { navNode: ChromeProjectNavigationNode }) => {
  const { activeNodes } = useNavigation();

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

  const [accordionStateById, setAccordionStateById] = useState<AccordionItemsState>(() => {
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

  const toggleAccordion = useCallback((path: string) => {
    setAccordionStateById((prev) => {
      const prevState = prev[path];
      const prevValue = prevState?.isCollapsed ?? DEFAULT_IS_COLLAPSED;
      const { isCollapsible } = prevState;
      return {
        ...prev,
        [path]: {
          ...prev[path],
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
      path: string,
      _accordionProps?: Partial<EuiAccordionProps>
    ): Partial<EuiAccordionProps> | undefined => {
      const isCollapsed = accordionStateById[path]?.isCollapsed;
      const isCollapsible = accordionStateById[path]?.isCollapsible;

      if (isCollapsed === undefined) return _accordionProps; // No state set yet

      let forceState: EuiAccordionProps['forceState'] = isCollapsed ? 'closed' : 'open';
      if (!isCollapsible) forceState = 'open'; // Allways open if the accordion is not collapsible

      const arrowProps: EuiAccordionProps['arrowProps'] = {
        css: isCollapsible ? undefined : { display: 'none' },
        'data-test-subj': classNames(`accordionArrow`, `accordionArrow-${path}`),
      };

      const updated: Partial<EuiAccordionProps & { isCollapsible?: boolean }> = {
        buttonProps: { 'data-test-subj': 'accordionToggleBtn' },
        ..._accordionProps,
        arrowProps,
        isCollapsible,
        forceState,
        onToggle: isCollapsible
          ? () => {
              toggleAccordion(path);
            }
          : undefined,
      };

      return updated;
    },
    [accordionStateById, toggleAccordion]
  );

  const getIsCollapsed = useCallback(
    (path: string) => {
      return accordionStateById[path]?.isCollapsed ?? DEFAULT_IS_COLLAPSED;
    },
    [accordionStateById]
  );

  /**
   * Effect to set the internal state of each of the accordions (isCollapsed) based on the
   * "isActive" state of the navNode or if its path matches the URL location
   */
  useEffect(() => {
    setAccordionStateById((prev) => {
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

  return {
    /** Get the EUI accordion props for the node at a specific path */
    getAccordionProps,
    /** Get the isCollapsed state for a node at a specific path */
    getIsCollapsed,
  };
};
