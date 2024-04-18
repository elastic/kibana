/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
// import { EuiPanel } from '@elastic/eui';
// import React, { useRef } from 'react';

// export function App() {
//   const ref = useRef(null);

//   return (
//     <EuiPanel hasBorder={true} paddingSize="none">
//       <div style={{ height: 800 }} ref={ref}>
//         hello?
//         {/* <Cytoscape
//           elements={data.elements}
//           height={heightWithPadding}
//           serviceName={serviceName}
//           style={getCytoscapeDivStyle(theme, status)}
//         >
//           <Controls />
//           <Popover
//             focusedServiceName={serviceName}
//             environment={environment}
//             kuery={kuery}
//             start={start}
//             end={end}
//           />
//         </Cytoscape> */}
//       </div>
//     </EuiPanel>
//   );
// }

import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { isEqual } from 'lodash';
import React, {
  createContext,
  CSSProperties,
  memo,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTheme } from '../../../hooks/use_theme';
import { useTraceExplorerEnabledSetting } from '../../../hooks/use_trace_explorer_enabled_setting';
import { getCytoscapeOptions } from './cytoscape_options';
import { useCytoscapeEventHandlers } from './use_cytoscape_event_handlers';

cytoscape.use(dagre);

export const CytoscapeContext = (createContext < cytoscape.Core) | (undefined > undefined);

function useCytoscape(options) {
  const [cy, setCy] = (useState < cytoscape.Core) | (undefined > undefined);
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

  return [ref, cy];
}

function CytoscapeComponent({ children, elements, height, serviceName, style }) {
  const isTraceExplorerEnabled = useTraceExplorerEnabledSetting();
  const [ref, cy] = useCytoscape({
    ...getCytoscapeOptions(theme, isTraceExplorerEnabled),
    elements,
  });
  useCytoscapeEventHandlers({ cy, serviceName });

  // Add items from the elements prop to the cytoscape collection and remove
  // items that no longer are in the list, then trigger an event to notify
  // the handlers that data has changed.
  useEffect(() => {
    if (cy && elements.length > 0) {
      // We do a fit if we're going from 0 to >0 elements
      const fit = cy.elements().length === 0;

      cy.add(elements);
      // Remove any old elements that don't exist in the new set of elements.
      const elementIds = elements.map((element) => element.data.id);
      cy.elements().forEach((element) => {
        if (!elementIds.includes(element.data('id'))) {
          cy.remove(element);
        } else {
          // Doing an "add" with an element with the same id will keep the original
          // element. Set the data with the new element data.
          const newElement = elements.find((el) => el.data.id === element.id());
          element.data(newElement?.data ?? element.data());
        }
      });
      cy.trigger('custom:data', [fit]);
    }
  }, [cy, elements]);

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

export const Cytoscape = memo(CytoscapeComponent, (prevProps, nextProps) => {
  const prevElementIds = prevProps.elements.map((element) => element.data.id).sort();
  const nextElementIds = nextProps.elements.map((element) => element.data.id).sort();

  const propsAreEqual =
    prevProps.height === nextProps.height &&
    prevProps.serviceName === nextProps.serviceName &&
    isEqual(prevProps.style, nextProps.style) &&
    isEqual(prevElementIds, nextElementIds);

  return propsAreEqual;
});
