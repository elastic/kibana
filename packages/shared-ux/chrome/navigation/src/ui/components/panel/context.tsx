/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { type FC, useCallback, useContext, useMemo, useState } from 'react';
import { DefaultContent } from './default_content';
import { ContentProvider, PanelNavNode } from './types';

export interface PanelContext {
  isOpen: boolean;
  toggle: () => void;
  open: (navNode: PanelNavNode) => void;
  close: () => void;
  activeNode: PanelNavNode | null;
  getContent: () => React.ReactNode;
}

const Context = React.createContext<PanelContext | null>(null);

interface Props {
  contentProvider?: ContentProvider;
}

export const PanelProvider: FC<Props> = ({ children, contentProvider }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeNode, setActiveNode] = useState<PanelNavNode | null>(null);

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
    if (!activeNode) {
      return null;
    }

    if (contentProvider) {
      const { title, content } = contentProvider(activeNode.id);
      return {
        content,
        title: title ?? activeNode.title,
      };
    }

    return <DefaultContent activeNode={activeNode} />;
  }, [activeNode, contentProvider]);

  const ctx: PanelContext = useMemo(
    () => ({
      isOpen,
      toggle,
      open,
      close,
      activeNode,
      getContent,
    }),
    [isOpen, toggle, open, close, activeNode, getContent]
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
