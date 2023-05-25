/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useState, useContext } from 'react';

interface GraphAPIInstance {
  setView: (
    centerPoint: { x: number; y: number },
    zoom: number,
    options?: { animate: boolean }
  ) => void;
  getView: () => { center: { x: number; y: number }; zoom: number };
}

export interface GraphContext {
  instance: GraphAPIInstance | null;
  setInstance: (instance: GraphAPIInstance) => void;
}

export const GraphContext = createContext<GraphContext | null>(null);

export function GraphRendererProvider({
  children,
}: {
  children: React.ReactChildren | React.ReactChild;
}) {
  const [instance, setInstance] = useState<GraphAPIInstance | null>(null);
  return (
    <GraphContext.Provider value={{ instance, setInstance }}>{children}</GraphContext.Provider>
  );
}

export function useViewport() {
  const context = useContext(GraphContext);
  if (context == null) {
    throw Error('useViewport hook requires the GraphRendererProvider component');
  }
  const instance = context.instance;
  return {
    setCenter: (x: number, y: number, zoom: number) => {
      instance?.setView({ x, y }, zoom);
    },
    zoomIn: () => {
      if (!instance) {
        return;
      }
      const { center, zoom } = instance.getView();
      return instance.setView(center, zoom * 1.1);
    },
    zoomOut: () => {
      if (!instance) {
        return;
      }
      const { center, zoom } = instance.getView();
      return instance.setView(center, zoom / 1.1);
    },
  };
}
