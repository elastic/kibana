/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEqual } from 'lodash';
import React, { CSSProperties, memo, ReactNode, useContext, useEffect, useMemo } from 'react';
import cytoscape from 'cytoscape';
import { EuiTheme } from '@kbn/kibana-react-plugin/common';
import { getCytoscapeOptions } from './cy_styles';
import { useCytoscapeEventHandlers } from './cy_events';
import { CytoscapeContext, useCytoscape } from './use_cytoscape';
import { GraphContext } from '../shared/context';
// import { CollapseExpandAPI } from './cy_types';

function createWrapperAPI(cy: cytoscape.Core) {
  return {
    getView: () => {
      return {
        zoom: cy.zoom(),
        center: cy.pan(),
      };
    },
    setView: (center: { x: number; y: number }, zoom: number, options?: { animate: boolean }) => {
      if (options?.animate) {
        return cy.animate({ zoom: { level: zoom, position: center } });
      }
      return cy.viewport(zoom, center);
    },
  };
}

export interface CytoscapeProps {
  children?: ReactNode;
  elements: cytoscape.ElementDefinition[];
  height: number;
  selectionId?: string;
  style?: CSSProperties;
  theme?: EuiTheme;
  onClick: cytoscape.EventHandler;
  onHover?: cytoscape.EventHandler;
  //   onDblClick: cytoscape.EventHandler;
  onSelection: cytoscape.EventHandler;
  onReady: cytoscape.EventHandler;
  setCy: (cy: cytoscape.Core | undefined) => void;
}

export function CytoscapeComponent({
  children,
  elements,
  height,
  selectionId,
  style,
  theme,
  onClick,
  //   onDblClick,
  onHover,
  onSelection,
  onReady,
  setCy,
}: CytoscapeProps) {
  const [ref, cy] = useCytoscape({
    ...getCytoscapeOptions(),
    elements,
  });
  useCytoscapeEventHandlers({ cy, nodeId: selectionId, onClick, onSelection, onReady, onHover });

  // Add items from the elements prop to the cytoscape collection and remove
  // items that no longer are in the list, then trigger an event to notify
  // the handlers that data has changed.
  useEffect(() => {
    if (cy && elements.length > 0) {
      // We do a fit if we're going from 0 to >0 elements
      const fit = cy.elements().length === 0;
      const ungroupedNodes = elements.filter(
        (el) => !(el.data.source && el.data.target) // && !collapseAPI.getParent(el.data.id!)?.length
      );
      const ungroupedLookup = new Set(ungroupedNodes.map(({ data }) => data.id));
      const ungroupedEdges = elements.filter(
        (el) =>
          el.data.source &&
          el.data.target &&
          ungroupedLookup.has(el.data.source) &&
          ungroupedLookup.has(el.data.target)
      );
      cy.add(ungroupedNodes.concat(ungroupedEdges));
      cy.add(elements);
      // Remove any old elements that don't exist in the new set of elements.
      const elementIds = new Set(elements.map((element) => element.data.id));
      cy.elements().forEach((element) => {
        if (!elementIds.has(element.data('id'))) {
          cy.remove(element);
        } else {
          // Doing an "add" with an element with the same id will keep the original
          // element. Set the data with the new element data.
          // const newElement = elements.find((el) => el.data.id === element.id());
          // element.data(newElement?.data ?? element.data());
        }
      });
      cy.trigger('custom:data', [fit]);
    }
  }, [cy, elements]);

  useEffect(() => {
    setCy(cy);
    // window.cy = cy;
  }, [cy, setCy]);

  const context = useContext(GraphContext);

  useEffect(() => {
    if (context && cy && !context.instance) {
      context.setInstance(createWrapperAPI(cy));
    }
  }, [context, cy]);

  // Add the height to the div style. The height is a separate prop because it
  // is required and can trigger rendering when changed.
  const divStyle = useMemo(
    () => ({
      ...style,
      position: 'absolute' as const,
      width: '100%',
      height: '100%',
      top: 0,
      left: 0,
    }),
    [style]
  );

  return (
    <CytoscapeContext.Provider value={cy}>
      <div ref={ref} style={divStyle}>
        {children}
      </div>
    </CytoscapeContext.Provider>
  );
}

export function areSameElements(
  prevElements: cytoscape.ElementDefinition[],
  newElements: cytoscape.ElementDefinition[]
) {
  const prevElementIds = prevElements.map((element) => element.data.id).sort();
  const nextElementIds = newElements.map((element) => element.data.id).sort();
  return isEqual(prevElementIds, nextElementIds);
}

export const Cytoscape = memo(CytoscapeComponent, (prevProps, nextProps) => {
  const prevStylings: Record<string, cytoscape.NodeDataDefinition | cytoscape.EdgeDataDefinition> =
    {};
  const nextStylings: Record<string, cytoscape.NodeDataDefinition | cytoscape.EdgeDataDefinition> =
    {};
  prevProps.elements.forEach((el) => {
    prevStylings[el.data.id!] = el.data;
  });
  nextProps.elements.forEach((el) => {
    nextStylings[el.data.id!] = el.data;
  });

  const propsAreEqual =
    isEqual(prevProps.style, nextProps.style) &&
    areSameElements(prevProps.elements, nextProps.elements) &&
    prevProps.elements.every((element) =>
      isEqual(prevStylings[element.data.id!], nextStylings[element.data.id!])
    );

  return propsAreEqual;
});
