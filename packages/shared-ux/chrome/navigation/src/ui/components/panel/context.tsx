/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { type FC, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';

import { DefaultContent } from './default_content';
import { ContentProvider, PanelNavNode } from './types';

export interface PanelContext {
  isOpen: boolean;
  toggle: () => void;
  open: (navNode: PanelNavNode) => void;
  close: () => void;
  /** The selected node is the node in the main panel that opens the Panel */
  selectedNode: PanelNavNode | null;
  /** Handler to retrieve the component to render in the panel */
  getContent: () => React.ReactNode;
}

const Context = React.createContext<PanelContext | null>(null);

interface Props {
  contentProvider?: ContentProvider;
  activeNodes: ChromeProjectNavigationNode[][];
}

export const PanelProvider: FC<Props> = ({ children, contentProvider, activeNodes }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNode, setActiveNode] = useState<PanelNavNode | null>(null);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const open = useCallback((navNode: PanelNavNode) => {
    setActiveNode(navNode);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setActiveNode(null);
    setIsOpen(false);
  }, []);

  const getContent = useCallback(() => {
    if (!selectedNode) {
      return null;
    }

    const provided = contentProvider?.(selectedNode.path);

    if (!provided) {
      return <DefaultContent selectedNode={selectedNode} />;
    }

    if (provided.content) {
      const Component = provided.content;
      return <Component closePanel={close} selectedNode={selectedNode} activeNodes={activeNodes} />;
    }

    const title: string | ReactNode = provided.title ?? selectedNode.title;
    return <DefaultContent selectedNode={{ ...selectedNode, title }} />;
  }, [selectedNode, contentProvider, close, activeNodes]);

  const ctx: PanelContext = useMemo(
    () => ({
      isOpen,
      toggle,
      open,
      close,
      selectedNode,
      getContent,
    }),
    [isOpen, toggle, open, close, selectedNode, getContent]
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
