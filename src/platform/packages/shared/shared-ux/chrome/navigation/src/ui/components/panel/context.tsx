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
  useEffect,
  useRef,
} from 'react';
import type { ChromeProjectNavigationNode, PanelSelectedNode } from '@kbn/core-chrome-browser';

import { DefaultContent } from './default_content';

export interface PanelContext {
  isOpen: boolean;
  toggle: () => void;
  open: (navNode: PanelSelectedNode, openerEl: Element | null) => void;
  close: () => void;
  /** The selected node is the node in the main panel that opens the Panel */
  selectedNode: PanelSelectedNode | null;
  /** Reference to the selected nav node element in the DOM */
  selectedNodeEl: React.MutableRefObject<Element | null>;
  /** Handler to retrieve the component to render in the panel */
  getContent: () => React.ReactNode;
}

const Context = React.createContext<PanelContext | null>(null);

interface Props {
  activeNodes: ChromeProjectNavigationNode[][];
  selectedNode?: PanelSelectedNode | null;
  setSelectedNode?: (node: PanelSelectedNode | null) => void;
}

export const PanelProvider: FC<PropsWithChildren<Props>> = ({
  children,
  selectedNode: selectedNodeProp = null,
  setSelectedNode,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNode, setActiveNode] = useState<PanelSelectedNode | null>(selectedNodeProp);
  const selectedNodeEl = useRef<Element | null>(null);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const open = useCallback(
    (navNode: PanelSelectedNode, openerEl: Element | null) => {
      setActiveNode(navNode);

      const navNodeEl = openerEl?.closest(`[data-test-subj~=nav-item]`);
      if (navNodeEl) {
        selectedNodeEl.current = navNodeEl;
      }

      setIsOpen(true);
      setSelectedNode?.(navNode);
    },
    [setSelectedNode]
  );

  const close = useCallback(() => {
    setActiveNode(null);
    selectedNodeEl.current = null;
    setIsOpen(false);
    setSelectedNode?.(null);
  }, [setSelectedNode]);

  useEffect(() => {
    if (selectedNodeProp === undefined) return;

    setActiveNode(selectedNodeProp);

    if (selectedNodeProp) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [selectedNodeProp]);

  const getContent = useCallback(() => {
    if (!selectedNode) {
      return null;
    }

    return <DefaultContent selectedNode={selectedNode} />;
  }, [selectedNode]);

  const ctx: PanelContext = useMemo(
    () => ({
      isOpen,
      toggle,
      open,
      close,
      selectedNode,
      selectedNodeEl,
      getContent,
    }),
    [isOpen, toggle, open, close, selectedNode, selectedNodeEl, getContent]
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
