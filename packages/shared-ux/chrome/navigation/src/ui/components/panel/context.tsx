/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import React, { FC, useCallback, useContext, useMemo, useState } from 'react';

type ContentProvider = (nodeId: string) => React.ReactNode;
type PanelNavNode = Pick<ChromeProjectNavigationNode, 'id' | 'children' | 'path'>;

export interface PanelContext {
  isOpen: boolean;
  toggle: () => void;
  open: (navNode: PanelNavNode) => void;
  close: () => void;
  activeNode: PanelNavNode | null;
  content: {
    set: (content: React.ReactNode) => void;
    get: () => React.ReactNode;
  };
}

const Context = React.createContext<PanelContext | null>(null);

interface Props {
  contentProvider?: ContentProvider;
}

export const PanelProvider: FC<Props> = ({ children, contentProvider }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<React.ReactNode>(null);
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
    setContent(null);
    setIsOpen(false);
  }, []);

  const getContent = useCallback(() => content, [content]);

  const setContentFn = useCallback((_content: React.ReactNode) => {
    setContent(_content);
  }, []);

  const ctx: PanelContext = useMemo(
    () => ({
      isOpen,
      toggle,
      open,
      close,
      activeNode,
      content: {
        set: setContentFn,
        get: getContent,
        provider: contentProvider,
      },
    }),
    [isOpen, toggle, open, close, activeNode, setContentFn, getContent, contentProvider]
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
