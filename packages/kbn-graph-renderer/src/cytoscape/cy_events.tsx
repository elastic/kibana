/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import cytoscape from 'cytoscape';
import { useEffect } from 'react';
import { getLayoutOptions } from './use_cytoscape';

function setCursor(cursor: string, event: cytoscape.EventObjectCore) {
  const container = event.cy.container();

  if (container) {
    container.style.cursor = cursor;
  }
}

export function useCytoscapeEventHandlers({
  cy,
  nodeId,
  onClick,
  //   onDblClick,
  onSelection,
  onHover,
  onReady,
}: {
  cy?: cytoscape.Core;
  nodeId?: string;
  onClick: cytoscape.EventHandler;
  onHover?: cytoscape.EventHandler;
  //   onDblClick: cytoscape.EventHandler;
  onSelection: cytoscape.EventHandler;
  onReady: cytoscape.EventHandler;
}) {
  useEffect(() => {
    const dataHandler: cytoscape.EventHandler = (event) => {
      event.cy.layout(getLayoutOptions()).run();
    };
    const mouseoverHandler: cytoscape.EventHandler = (event) => {
      if (event.target.isNode()) {
        setCursor('pointer', event);
      }
      event.target.addClass('hover');
      event.target.connectedEdges().addClass('nodeHover');
      onHover?.(event);
    };
    const mouseoutHandler: cytoscape.EventHandler = (event) => {
      setCursor('grab', event);

      event.target.removeClass('hover');
      event.target.connectedEdges().removeClass('nodeHover');
    };

    const debugHandler: cytoscape.EventHandler = (event) => {
      const debugEnabled = true; // sessionStorage.getItem('graph_debug') === 'true';
      if (debugEnabled) {
        // eslint-disable-next-line no-console
        console.debug('cytoscape:', event);
      }
    };
    // const dragHandler: cytoscape.EventHandler = (event) => {
    //   setCursor('grabbing', event);

    //   if (!event.target.data('hasBeenDragged')) {
    //     event.target.data('hasBeenDragged', true);
    //   }
    // };
    // const dragfreeHandler: cytoscape.EventHandler = (event) => {
    //   setCursor('pointer', event);
    // };
    // const tapstartHandler: cytoscape.EventHandler = (event) => {
    //   // Onle set cursot to "grabbing" if the target doesn't have an "isNode"
    //   // property (meaning it's the canvas) or if "isNode" is false (meaning
    //   // it's an edge.)
    //   if (!event.target.isNode || !event.target.isNode()) {
    //     setCursor('grabbing', event);
    //   }
    // };
    // const tapendHandler: cytoscape.EventHandler = (event) => {
    //   if (!event.target.isNode || !event.target.isNode()) {
    //     setCursor('grab', event);
    //   }
    // };

    if (cy) {
      cy.on('custom:data layoutstop select unselect ready click dblclick', debugHandler);
      cy.on('custom:data', dataHandler);
      cy.on('ready', onReady);
      cy.on('mouseover', 'edge, node', mouseoverHandler);
      cy.on('mouseout', 'edge, node', mouseoutHandler);
      cy.on('select', onSelection);
      cy.on('unselect', onSelection);
      // cy.on('drag', 'node', dragHandler);
      // cy.on('dragfree', 'node', dragfreeHandler);
      // cy.on('tapstart', tapstartHandler);
      // cy.on('tapend', tapendHandler);
      cy.on('click', onClick);
      //   cy.on('dblclick', onDblClick);
    }

    return () => {
      if (cy) {
        cy.removeListener(
          'custom:data drag dragfree layoutstop select tapstart tapend unselect',
          undefined,
          debugHandler
        );
        cy.removeListener('custom:data', undefined, dataHandler);
        cy.removeListener('ready', undefined, onReady);
        cy.removeListener('mouseover', 'edge, node', mouseoverHandler);
        cy.removeListener('mouseout', 'edge, node', mouseoutHandler);
        cy.removeListener('select', undefined, onSelection);
        cy.removeListener('unselect', undefined, onSelection);
        // cy.removeListener('drag', 'node', dragHandler);
        // cy.removeListener('dragfree', 'node', dragfreeHandler);
        // cy.removeListener('tapstart', undefined, tapstartHandler);
        // cy.removeListener('tapend', undefined, tapendHandler);
        cy.removeListener('vclick', 'edge, node', onClick);
        // cy.removeListener('dblclick', undefined, onDblClick);
      }
    };
  }, [cy, nodeId, onClick, onSelection, onHover, onReady]);
}
