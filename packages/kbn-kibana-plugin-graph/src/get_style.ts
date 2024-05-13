/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import cytoscape from 'cytoscape';
import { EuiTheme } from '@kbn/kibana-react-plugin/common';

export const getStyle = (theme: EuiTheme): cytoscape.Stylesheet[] => {
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
        color: (el: cytoscape.NodeSingular) => {
          // TEXT COLOR
          return el.selected() ? theme.eui.euiColorPrimaryText : theme.eui.euiColorPrimary;
        },
        // theme.euiFontFamily doesn't work here for some reason, so we're just
        // specifying a subset of the fonts for the label text.
        'font-family': 'Inter UI, Segoe UI, Helvetica, Arial, sans-serif',
        'font-size': theme.eui.euiFontSizeS,
        // ghost: 'yes',
        // 'ghost-offset-x': 0,
        // 'ghost-offset-y': 2,
        // 'ghost-opacity': 0.15,
        // height: 5,
        label: (el: cytoscape.NodeSingular) => {
          return el.data('id');
        },
        'min-zoomed-font-size': parseInt(theme.eui.euiSizeS, 10),
        shape: (el: cytoscape.NodeSingular) => {
          return el.data('type') === 'plugin' ? 'ellipse' : 'diamond';
        },
        'text-background-color': '#ffffff',
        'text-background-opacity': (el: cytoscape.NodeSingular) =>
          el.hasClass('primary') || el.selected() ? 0.1 : 1,
        'text-background-padding': theme.eui.euiSizeXS,
        'text-background-shape': 'roundrectangle',
        'text-margin-y': parseInt(theme.eui.euiSizeL, 10),
        'text-max-width': '200px',
        'text-valign': 'bottom',
        'text-wrap': 'ellipsis',
        // width: 5,
        // 'z-index': zIndexNode,
      },
    },
    {
      selector: 'edge',
      style: {
        'curve-style': 'unbundled-bezier',
        'line-color': (edge) =>
          edge.data('type') === 'requiredPlugin'
            ? theme.eui.euiColorPrimary
            : theme.eui.euiColorAccent,
        opacity: 0.5,
        'overlay-opacity': 0,
        'target-arrow-color': lineColor,
        'target-arrow-shape': 'triangle',
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
        opacity: 1,
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
