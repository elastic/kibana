/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { CytoscapeRenderer } from './cytoscape';
import { D3GraphRenderer, D3GraphWrapper } from './d3';
import { GraphVisualizationProps } from './types';

export function GraphRenderer(props: GraphVisualizationProps) {
  if (props.type === 'd3') {
    return <D3GraphWrapper {...props} />;
  }
  if (props.type === 'd3-raw') {
    return <D3GraphRenderer {...props} />;
  }
  if (props.type === 'canvas') {
    return <CytoscapeRenderer {...props} />;
  }
  throw Error('No renderer found');
  return null;
}
