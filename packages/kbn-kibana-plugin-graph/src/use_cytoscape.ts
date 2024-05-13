/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import cytoscape from 'cytoscape';
import { useEffect, useRef, useState } from 'react';
import { isEqual } from 'lodash';

export function useCytoscape({
  options,
  layoutOptions,
}: {
  options: cytoscape.CytoscapeOptions;
  layoutOptions: any;
}) {
  const [cy, setCy] = useState<cytoscape.Core | undefined>(undefined);
  const [stateElements, setStateElements] = useState(options.elements);
  const [stateLayoutOptions, _] = useState();

  const ref = useRef(null);

  useEffect(() => {
    if (!cy) {
      setCy(cytoscape({ ...options, container: ref.current }));
    } else if (!isEqual(options.elements, stateElements)) {
      cy.elements().remove();
      cy.resize();
      cy.add(options.elements);
      cy?.layout(layoutOptions).run();
      cy?.fit();
      setStateElements(options.elements);
    }
  }, [options, cy, layoutOptions, stateElements]);

  useEffect(() => {
    cy?.layout(layoutOptions).run();
  }, [cy, layoutOptions, stateLayoutOptions]);

  useEffect(() => {
    return () => {
      if (cy) {
        cy.destroy();
      }
    };
  }, [cy]);

  return [ref, cy] as [React.MutableRefObject<any>, cytoscape.Core | undefined];
}
