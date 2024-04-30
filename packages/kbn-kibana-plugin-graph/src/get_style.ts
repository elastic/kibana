/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import cytoscape from 'cytoscape';
import { EuiTheme } from '@kbn/kibana-react-plugin/common';

export const getStyle = (
  theme: EuiTheme
  // isTraceExplorerEnabled: boolean
): cytoscape.Stylesheet[] => {
  const lineColor = theme.eui.euiColorPrimary;
  return [
    {
      selector: 'core',
      // @ts-expect-error DefinitelyTyped does not recognize 'active-bg-opacity'
      style: { 'active-bg-opacity': 0 },
    },
    {
      selector: 'node',
      style: {
        'background-color': theme.eui.euiColorPrimary,
        // The DefinitelyTyped definitions don't specify that a function can be
        // used here.
        // 'background-image': (el: cytoscape.NodeSingular) => iconForNode(el),
        // 'background-height': (el: cytoscape.NodeSingular) => (isService(el) ? '60%' : '40%'),
        // 'background-width': (el: cytoscape.NodeSingular) => (isService(el) ? '60%' : '40%'),
        // 'border-color': theme.eui.euiColorPrimary,
        // 'border-style': 'solid',
        // 'border-width': '40%',
        color: (el: cytoscape.NodeSingular) => {
          return el.selected() ? theme.eui.euiColorPrimaryText : theme.eui.euiTextColor;
        },
        // theme.euiFontFamily doesn't work here for some reason, so we're just
        // specifying a subset of the fonts for the label text.
        'font-family': 'Inter UI, Segoe UI, Helvetica, Arial, sans-serif',
        'font-size': theme.eui.euiFontSizeS,
        // ghost: 'yes',
        // 'ghost-offset-x': 0,
        // 'ghost-offset-y': 2,
        // 'ghost-opacity': 0.15,
        height: 5,
        label: (el: cytoscape.NodeSingular) => {
          return el.data('id');
        },
        'min-zoomed-font-size': parseInt(theme.eui.euiSizeS, 10),
        'overlay-opacity': 1,
        shape: (el: cytoscape.NodeSingular) => {
          console.log('el.data', el.data());
          return el.data('type') === 'plugin' ? 'ellipse' : 'diamond';
        },
        'text-background-color': theme.eui.euiColorPrimary,
        'text-background-opacity': (el: cytoscape.NodeSingular) =>
          el.hasClass('primary') || el.selected() ? 0.1 : 0,
        'text-background-padding': theme.eui.euiSizeXS,
        'text-background-shape': 'roundrectangle',
        'text-margin-y': parseInt(theme.eui.euiSizeL, 10),
        'text-max-width': '200px',
        'text-valign': 'bottom',
        'text-wrap': 'ellipsis',
        width: 5,
        // 'z-index': zIndexNode,
      },
    },
    {
      selector: 'edge',
      style: {
        'curve-style': 'unbundled-bezier',
        'line-color': lineColor,
        'overlay-opacity': 0,
        'target-arrow-color': lineColor,
        'target-arrow-shape': 'triangle',
        // The DefinitelyTyped definitions don't specify this property since it's
        // fairly new.
        //
        'target-distance-from-node': parseInt(theme.eui.euiSizeXS, 10),
        width: 1,
        'source-arrow-shape': 'none',
        // 'z-index': zIndexEdge,
      },
    },
    {
      selector: 'edge[bidirectional]',
      style: {
        'source-arrow-shape': 'triangle',
        'source-arrow-color': lineColor,
        'target-arrow-shape': 'triangle',
        'target-distance-from-node': parseInt(theme.eui.euiSizeXS, 10),
      },
    },
    {
      selector: 'edge[isInverseEdge]',
      // @ts-expect-error DefinitelyTyped says visibility is "none" but it's
      // actually "hidden"
      style: { visibility: 'hidden' },
    },
    {
      selector: 'edge.nodeHover',
      style: {
        width: 4,
        // 'z-index': zIndexEdgeHover,
        'line-color': theme.eui.euiColorDarkShade,
        'source-arrow-color': theme.eui.euiColorDarkShade,
        'target-arrow-color': theme.eui.euiColorDarkShade,
      },
    },
    {
      selector: 'node.hover',
      style: {
        // 'border-width': getBorderWidth,
      },
    },
    {
      selector: 'edge.highlight',
      style: {
        width: 4,
        'line-color': theme.eui.euiColorPrimary,
        'source-arrow-color': theme.eui.euiColorPrimary,
        'target-arrow-color': theme.eui.euiColorPrimary,
        // 'z-index': zIndexEdgeHighlight,
      },
    },
  ];
};
