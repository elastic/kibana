/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isColorDark } from '@elastic/eui';
import chroma from 'chroma-js';
import cytoscape from 'cytoscape';
import { renderFontIcon } from './cy_fontawesome_renderer';

export interface GraphStyleOptions {
  directions?: Record<string, 'source' | 'target'>;
}

const cachedIcons: Record<string, { url: string; width: number; height: number }> = {};

export const getCytoscapeOptions = (
  options: GraphStyleOptions = {}
): cytoscape.CytoscapeOptions => ({
  boxSelectionEnabled: true,
  maxZoom: 3,
  minZoom: 0.1,
  style: cytoscape
    // @ts-expect-error
    .stylesheet()
    .selector('node')
    .style({
      'font-size': 8,
      color: '#69707D',
      'text-wrap': 'ellipsis',
      'text-max-width': 80,
      'background-color': (node: cytoscape.NodeSingular) => node.data('color'),
      'background-image': (node: cytoscape.NodeSingular) => {
        const { icon, color, scaledSize } = node.data();
        const key = `${icon.version}-${icon.name}-${color}-${scaledSize}`;
        if (!cachedIcons[key]) {
          cachedIcons[key] = renderFontIcon(
            icon,
            isColorDark(...chroma(color).rgb()) ? 'white' : 'black',
            (scaledSize ?? 15) * 0.6
          );
        }
        return cachedIcons[key].url;
      },
      // content: (node: cytoscape.NodeSingular) => node.data('icon'),
      label: (node: cytoscape.NodeSingular) => node.data('label') || '(empty)',
      'text-valign': 'bottom',
      'text-halign': 'center',
      width: (node: cytoscape.NodeSingular) => node.data('scaledSize') ?? 15,
      height: (node: cytoscape.NodeSingular) => node.data('scaledSize') ?? 15,
    })
    .selector(':parent')
    .style({
      'background-color': (node: cytoscape.NodeSingular) => node.data('color'),
      'background-opacity': 0.5,
      'text-valign': 'top',
      'text-halign': 'center',
    })
    .selector('.filtered')
    .style({
      opacity: 0.25,
      'text-opacity': 0,
    })
    .selector(':selected')
    .style({
      'border-width': 2,
      'border-color': 'rgb(0,119,204)',
      'border-opacity': 0.75,
    })
    .selector('edge')
    .style({
      // 'mid-target-arrow-shape': 'triangle',
      'source-arrow-shape': options?.directions
        ? (el: cytoscape.EdgeSingular) => {
            return options!.directions![el.data('field')] === 'source' ? 'triangle' : 'none';
          }
        : 'none',
      'source-arrow-color': (el: cytoscape.EdgeSingular) =>
        (el.source().data('color') as string) ?? '#69707D',
      'target-arrow-shape': options?.directions
        ? (el: cytoscape.EdgeSingular) => {
            return options!.directions![el.data('field')] === 'target' ? 'triangle' : 'none';
          }
        : 'none',
      'target-arrow-color': (el: cytoscape.EdgeSingular) =>
        (el.target().data('color') as string) ?? '#69707D',
      'line-fill': 'linear-gradient',
      // 'line-fill': 'solid',
      // 'line-color': 'rgba(127, 127, 127, 0.5)',
      // 'line-color': (el: cytoscape.EdgeSingular) =>
      //   (el.target().data('color') as string) ?? '#69707D',
      'curve-style': 'bezier',
      'line-gradient-stop-colors': (el: cytoscape.EdgeSingular) =>
        el.connectedNodes().map((n) => n.data('color') as string),
      'line-gradient-stop-positions': [0, 66],
      width: (el: cytoscape.EdgeSingular) => {
        const data = el.data();
        if (data.width) {
          return Math.log((1 + data.width) as number);
        }
        return data.collapsedEdges?.length || 1;
      },
    })
    .selector('edge.nodeHover')
    .style({
      'border-width': 1,
      'border-color': 'rgb(0,119,204)',
      'border-opacity': 0.3,
    }),
  // style: getStyle(theme),
});
