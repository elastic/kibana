/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { CSSProperties, ReactNode } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { useTheme } from './use_theme';
import { getStyle } from './get_style';
import { useCytoscape } from './use_cytoscape';

cytoscape.use(dagre);

export interface CytoscapeProps {
  children?: ReactNode;
  elements: cytoscape.ElementsDefinition;
  height: number;
  width: number;
  style?: CSSProperties;
  layoutOptions: any;
  onReady: () => void;
}

export function Cytoscape({
  children,
  elements,
  height,
  width,
  style,
  layoutOptions,
}: CytoscapeProps) {
  const theme = useTheme();
  const [ref] = useCytoscape({
    options: {
      boxSelectionEnabled: false,
      maxZoom: 3,
      minZoom: 0.0000002,
      style: getStyle(theme),
      elements,
    },
    layoutOptions,
  });

  return (
    <div ref={ref} style={{ ...style, height, width }}>
      {children}
    </div>
  );
}
