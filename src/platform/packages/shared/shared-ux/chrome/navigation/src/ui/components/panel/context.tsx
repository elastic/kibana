/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  type FC,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
  useEffect,
  useRef,
} from 'react';
import type { ChromeProjectNavigationNode, PanelSelectedNode } from '@kbn/core-chrome-browser';

import { DefaultContent } from './default_content';
import { ContentProvider } from './types';
import { useHoverOpener2 } from './use_hover_opener';

export interface PanelContext {
  isOpen: boolean;
  open: (navNode: PanelSelectedNode, openerEl: Element | null) => void;
  close: () => void;
  /** The selected node is the node in the main panel that opens the Panel */
  selectedNode: PanelSelectedNode | null;
  /** Reference to the selected nav node element in the DOM */
  selectedNodeEl: React.MutableRefObject<Element | null>;

  hoverIn: (navNode: PanelSelectedNode) => void;
  hoverOut: (navNode: PanelSelectedNode) => void;
  /** The node that is hovered over in the navigation */
  hoveredNode: PanelSelectedNode | null;

  /** Handler to retrieve the component to render in the panel */
  getContent: () => React.ReactNode;
}

const Context = React.createContext<PanelContext | null>(null);

interface Props {
  contentProvider?: ContentProvider;
  activeNodes: ChromeProjectNavigationNode[][];
  selectedNode?: PanelSelectedNode | null;
  setSelectedNode?: (node: PanelSelectedNode | null) => void;
}

export const PanelProvider: FC<PropsWithChildren<Props>> = ({
  children,
  contentProvider,
  activeNodes,
  selectedNode: selectedNodeProp = null,
  setSelectedNode,
}) => {
  const [selectedNode, setActiveNode] = useState<PanelSelectedNode | null>(selectedNodeProp);
  const selectedNodeEl = useRef<Element | null>(null);
  const [hoveredNode, setHoveredNode] = useState<PanelSelectedNode | null>(null);

  const open = useCallback(
    (navNode: PanelSelectedNode, openerEl: Element | null) => {
      setActiveNode(navNode);

      const navNodeEl = openerEl?.closest(`[data-test-subj~=nav-item]`);
      if (navNodeEl) {
        selectedNodeEl.current = navNodeEl;
      }

      setSelectedNode?.(navNode);
    },
    [setSelectedNode]
  );

  const close = useCallback(() => {
    setActiveNode(null);
    selectedNodeEl.current = null;
    setSelectedNode?.(null);
    setHoveredNode(null);
  }, [setSelectedNode]);

  useEffect(() => {
    if (selectedNodeProp === undefined) return;

    setActiveNode(selectedNodeProp);
  }, [selectedNodeProp]);

  const { onMouseLeave, onMouseEnter } = useHoverOpener2({
    onHover: useCallback(
      (node: PanelSelectedNode) => {
        if (selectedNode && node !== selectedNode) {
          close();
        }
        setHoveredNode(node);
      },
      [selectedNode, close]
    ),
    onLeave: useCallback(() => {
      setHoveredNode(null);
    }, []),
  });

  const getContent = useCallback(() => {
    const contentNode = hoveredNode || selectedNode;
    if (!contentNode) {
      return null;
    }

    const provided = contentProvider?.(contentNode.path);

    if (!provided) {
      return <DefaultContent selectedNode={contentNode} />;
    }

    if (provided.content) {
      const Component = provided.content;
      return <Component closePanel={close} selectedNode={contentNode} activeNodes={activeNodes} />;
    }

    const title: string | ReactNode = provided.title ?? contentNode.title;
    return <DefaultContent selectedNode={{ ...contentNode, title }} />;
  }, [hoveredNode, selectedNode, contentProvider, close, activeNodes]);

  const ctx: PanelContext = useMemo(
    () => ({
      isOpen: Boolean(selectedNode || hoveredNode),
      open,
      close,
      selectedNode,
      selectedNodeEl,
      getContent,
      hoveredNode,
      hoverIn: onMouseEnter,
      hoverOut: onMouseLeave,
    }),
    [hoveredNode, open, close, selectedNode, getContent, onMouseEnter, onMouseLeave]
  );

  return <Context.Provider value={ctx}>{children}</Context.Provider>;
};

export function usePanel() {
  const context = useContext(Context);

  if (!context) {
    throw new Error(
      'Panel Context is missing. Ensure your component or React root is wrapped with PanelProvider.'
    );
  }

  return context;
}
