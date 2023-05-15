/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useReducer, useContext, Dispatch } from 'react';

interface Viewport {
  x: number;
  y: number;
  zoom: number;
  animated?: boolean;
}

interface ContextState {
  view: Viewport;
}

export interface GraphContext {
  state: ContextState;
  dispatch: Dispatch<GraphActionType>;
}

type GraphActionType =
  | {
      type: 'viewportCenter';
      payload: Partial<Viewport>;
    }
  | { type: 'viewportZoomIn' }
  | { type: 'viewportZoomOut' };

const initialValue: ContextState = { view: { x: 0, y: 0, zoom: 1 } };

export const GraphContext = createContext<GraphContext | null>(null);

function reducer(state: ContextState, action: GraphActionType): ContextState {
  switch (action.type) {
    case 'viewportCenter': {
      return { view: { ...state.view, ...action.payload } };
    }
    case 'viewportZoomIn': {
      return { view: { ...state.view, zoom: state.view.zoom * 1.1 } };
    }
    case 'viewportZoomIn': {
      return { view: { ...state.view, zoom: state.view.zoom / 1.1 } };
    }
    default:
      return state;
  }
}

export function GraphRendererProvider({
  children,
}: {
  children: React.ReactChildren | React.ReactChild;
}) {
  const [state, dispatch] = useReducer(reducer, initialValue);
  return <GraphContext.Provider value={{ state, dispatch }}>{children}</GraphContext.Provider>;
}

export function useViewport() {
  const context = useContext(GraphContext);
  if (context == null) {
    throw Error('useViewport hook requires the GraphRendererProvider component');
  }
  const { dispatch } = context;
  return {
    setCenter: (x: number, y: number, zoom: number) =>
      dispatch({ type: 'viewportCenter', payload: { x, y, zoom } }),
    zoomIn: () => dispatch({ type: 'viewportZoomIn' }),
    zoomOut: () => dispatch({ type: 'viewportZoomOut' }),
  };
}
