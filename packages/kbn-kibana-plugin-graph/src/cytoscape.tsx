/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, CSSProperties, ReactNode, useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { useTheme } from './use_theme';
import { getStyle } from './get_style';

cytoscape.use(dagre);

export const CytoscapeContext = createContext<cytoscape.Core | undefined>(undefined);

export interface CytoscapeProps {
  children?: ReactNode;
  elements: cytoscape.ElementsDefinition;
  height: number;
  style?: CSSProperties;
}

function useCytoscape(options: cytoscape.CytoscapeOptions) {
  const [cy, setCy] = useState<cytoscape.Core | undefined>(undefined);
  const ref = useRef(null);

  useEffect(() => {
    if (!cy) {
      setCy(cytoscape({ ...options, container: ref.current }));
    }
  }, [options, cy]);

  // Destroy the cytoscape instance on unmount
  useEffect(() => {
    return () => {
      if (cy) {
        cy.destroy();
      }
    };
  }, [cy]);

  return [ref, cy] as [React.MutableRefObject<any>, cytoscape.Core | undefined];
}

export function Cytoscape({ children, elements, height, style }: CytoscapeProps) {
  const theme = useTheme();
  const [ref, cy] = useCytoscape({
    ...{
      boxSelectionEnabled: false,
      maxZoom: 3,
      minZoom: 0.0000002,
      style: getStyle(theme),
    },
    elements,
    layout: {
      name: 'cose',
      padding: 10,
      componentSpacing: 50,
      avoidOverlap: true,
      nodeRepulsion: () => 200000000,
      fit: true,
      sort: (a, b) => a.data.weight - b.data.weight,
    },
  });

  // Add the height to the div style. The height is a separate prop because it
  // is required and can trigger rendering when changed.
  const divStyle = { ...style, height };

  return (
    <CytoscapeContext.Provider value={cy}>
      <div ref={ref} style={divStyle}>
        {children}
      </div>
    </CytoscapeContext.Provider>
  );
}
