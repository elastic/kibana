/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useEffect, useRef, useState } from 'react';
import { EuiIcon, htmlIdGenerator } from '@elastic/eui';
import classNames from 'classnames';
import d3, { ZoomEvent } from 'd3';
import { isColorDark } from '@elastic/eui';
import chroma from 'chroma-js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { GraphVisualizationProps, WorkspaceEdge } from '../types';
import { makeEdgeId, makeNodeId } from '../helper';
import './_index.scss';
import { GraphContext } from '../shared/context';

function changeViewport(element: SVGSVGElement, translate: number[], zoom: number) {
  return d3
    .select(element)
    .select('g')
    .attr('transform', `translate(${translate[0]}, ${translate[1]})scale(${zoom})`)
    .attr('style', 'stroke-width: ' + 1 / zoom);
}

function shouldChangeView(x: number, y: number, zoomValue: number) {
  const zoom = d3.behavior.zoom();
  const [currX, currY] = zoom.translate();
  return currX !== x || currY !== y || zoomValue !== zoom.scale();
}

function setView(
  element: SVGSVGElement,
  x: number,
  y: number,
  { zoom, duration }: { zoom: number; duration?: number }
) {
  if (!shouldChangeView(x, y, zoom)) {
    return;
  }
  if (duration != null) {
    return d3
      .select(element)
      .transition()
      .duration(1300)
      .tween('zoom', () => {
        const interpolatedTranslationFn = d3.interpolate(d3.behavior.zoom().translate(), [x, y]);
        const interpolatedScaleFn = d3.interpolate(d3.behavior.zoom().scale(), zoom);
        return function (t) {
          return changeViewport(element, interpolatedTranslationFn(t), interpolatedScaleFn(t));
        };
      });
  }
  return changeViewport(element, [x, y], zoom);
}

function createWrapperAPI(element: SVGSVGElement) {
  return {
    getView: () => {
      const zoom = d3.behavior.zoom();
      const [x, y] = zoom.translate();
      return { center: { x, y }, zoom: zoom.scale() };
    },
    setView: (center: { x: number; y: number }, zoom: number, options?: { animate: boolean }) => {
      setView(element, center.x, center.y, { zoom, duration: options?.animate ? 1000 : undefined });
    },
  };
}

function registerZooming(element: SVGSVGElement) {
  const blockScroll = function () {
    (d3.event as Event).preventDefault();
  };
  d3.select(element)
    .on('mousewheel', blockScroll)
    .on('DOMMouseScroll', blockScroll)
    .call(
      d3.behavior.zoom().on('zoom', () => {
        const event = d3.event as ZoomEvent;
        changeViewport(element, event.translate, event.scale);
      })
    );
}

export function D3GraphWrapper({ edges, nodes, ...rest }: GraphVisualizationProps) {
  const elementsRef = useRef({ nodes, edges });
  const [counter, setCounter] = useState(0);

  // Update the ref when elements change
  useEffect(() => {
    if (nodes.length !== elementsRef.current.nodes.length) {
      elementsRef.current = { ...elementsRef.current, nodes };
    }
    if (edges.length !== elementsRef.current.edges.length) {
      elementsRef.current = { ...elementsRef.current, edges };
    }
    // workout the diffs for each node/edge
    const nodeIds = new Set(elementsRef.current.nodes.map(({ id }) => id));
    if (elementsRef.current.nodes.some(({ id }) => nodeIds.has(id))) {
      elementsRef.current = { ...elementsRef.current, nodes };
    }
    const edgeIds = new Set(elementsRef.current.edges.map(({ id }) => id));
    if (elementsRef.current.edges.some(({ id }) => edgeIds.has(id))) {
      elementsRef.current = { ...elementsRef.current, edges };
    }
  }, [edges, elementsRef, nodes]);

  useEffect(() => {
    const force = d3.layout
      .force()
      .nodes(elementsRef.current.nodes)
      .links(elementsRef.current.edges)
      .friction(0.8)
      .linkDistance(100)
      .charge(-1500)
      .gravity(0.15)
      .theta(0.99)
      .alpha(0.5)
      .size([800, 600]);
    // run all the simulation statically
    force.start();
    for (let i = 0; i < 300; ++i) {
      force.tick();
    }
    force.stop();
    const nodeArray = elementsRef.current.nodes;
    // Update the position of all "top level nodes"
    nodeArray.forEach((n) => {
      // Code to support roll-ups
      if (n.parent == null) {
        n.kx = n.x;
        n.ky = n.y;
      }
    });
    setCounter((v) => v + 1);
  }, [edges, nodes]);

  return (
    <D3GraphRenderer
      nodes={elementsRef.current.nodes}
      edges={elementsRef.current.edges}
      {...rest}
      key={counter}
    />
  );
}

/**
 * Function to compute path for curved or straight edges
 */
function positionLink(link: WorkspaceEdge) {
  const linkOffset = link.offset ?? 0;
  const offsetFactor = linkOffset % 2 === 0 ? linkOffset / 2 : (linkOffset + 1) / 2;
  const r = Math.hypot(link.target.x - link.source.x, link.target.y - link.source.y) / offsetFactor;
  return `
    M${link.source.x},${link.source.y}
    A${r},${r} 0 0,${linkOffset % 2 === 0 ? 1 : 0} ${link.target.x},${link.target.y}
  `;
}
const generatedSvgId = htmlIdGenerator('graphSvg')();

export function D3GraphRenderer({
  edges,
  nodes,
  onNodeClick,
  onEdgeClick,
  onEdgeHover,
}: GraphVisualizationProps) {
  const svgRoot = useRef<SVGSVGElement | null>(null);
  const svgId = useRef<string>(generatedSvgId);
  const context = useContext(GraphContext);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="gphGraph"
      width="100%"
      height="100%"
      pointerEvents="all"
      id={svgId.current}
      ref={(element) => {
        if (element && svgRoot.current !== element) {
          svgRoot.current = element;
          registerZooming(element);

          if (context && !context.instance) {
            context.setInstance(createWrapperAPI(svgRoot.current));
          }
        }
      }}
    >
      <g>
        <g>
          {edges &&
            edges.map((edge) => {
              const id = makeEdgeId(edge);
              const pathAttr = edge.offset ? positionLink(edge) : '';
              const strokeClickableWidth = Math.max(edge.width, 15);
              const edgeClassname = classNames('gphEdge', {
                'gphEdge--selected': edge.isSelected,
                'gphEdge--curved': edge.offset,
              });
              const edgeStyle = {
                strokeWidth: edge.width,
                ...(edge.color ? { stroke: edge.color } : {}),
              };
              const edgeClickableStyle = {
                strokeWidth: strokeClickableWidth,
                ...(edge.color ? { stroke: edge.color } : {}),
              };
              return (
                <g key={id} className="gphEdge--wrapper">
                  {/* Draw two edges: a thicker one for better click handling and the one to show the user */}
                  {edge.offset ? (
                    <>
                      <path
                        id={id}
                        d={pathAttr}
                        className={edgeClassname}
                        strokeLinecap="round"
                        style={edgeStyle}
                      />
                      <path
                        d={pathAttr}
                        onClick={(ev) => {
                          onEdgeClick(edge, ev);
                        }}
                        className="gphEdge gphEdge--clickable"
                        style={edgeClickableStyle}
                        onMouseOver={(ev) => onEdgeHover?.(edge, ev)}
                      />
                    </>
                  ) : (
                    <>
                      <line
                        x1={edge.topSrc.kx}
                        y1={edge.topSrc.ky}
                        x2={edge.topTarget.kx}
                        y2={edge.topTarget.ky}
                        className={edgeClassname}
                        strokeLinecap="round"
                        style={edgeStyle}
                      />
                      <line
                        x1={edge.topSrc.kx}
                        y1={edge.topSrc.ky}
                        x2={edge.topTarget.kx}
                        y2={edge.topTarget.ky}
                        onClick={(ev) => {
                          onEdgeClick(edge, ev);
                        }}
                        className="gphEdge gphEdge--clickable"
                        style={edgeClickableStyle}
                        onMouseOver={(ev) => onEdgeHover?.(edge, ev)}
                      />
                    </>
                  )}
                </g>
              );
            })}
        </g>
        {nodes &&
          nodes
            .filter((node) => !node.parent)
            .map((node) => {
              let iconComponent = null;
              if (node.kx == null || node.ky == null) {
                return iconComponent;
              }
              if (node.icon != null) {
                const backgroundColor = isColorDark(...chroma(node.color).rgb())
                  ? 'white'
                  : 'black';
                if (node.icon.version === 'eui') {
                  iconComponent = (
                    <g>
                      <EuiIcon
                        type={node.icon.name}
                        x={node.kx - 7.5}
                        y={node.ky - 8.5}
                        color={backgroundColor}
                      />
                    </g>
                  );
                } else {
                  iconComponent = (
                    <g>
                      <FontAwesomeIcon
                        icon={node.icon.name}
                        color={backgroundColor}
                        x={node.kx - 7.5}
                        y={node.ky - 8.5}
                        width={node.scaledSize}
                        height={node.scaledSize}
                      />
                    </g>
                  );
                }
              }
              return (
                <g
                  key={node.id || makeNodeId(node.data.field, node.data.term)}
                  onClick={(e) => {
                    onNodeClick(node, e);
                  }}
                  onMouseDown={(e) => {
                    // avoid selecting text when selecting nodes
                    if (e.ctrlKey || e.shiftKey) {
                      e.preventDefault();
                    }
                  }}
                  className="gphNode"
                >
                  <circle
                    cx={node.kx}
                    cy={node.ky}
                    r={node.scaledSize}
                    className={classNames('gphNode__circle', {
                      'gphNode__circle--selected': node.isSelected,
                    })}
                    style={{ fill: node.color }}
                  />
                  {iconComponent}

                  {node.label.length < 30 && (
                    <text
                      className="gphNode__label"
                      textAnchor="middle"
                      transform="translate(0,22)"
                      x={node.kx}
                      y={node.ky}
                    >
                      {node.label}
                    </text>
                  )}
                  {node.label.length >= 30 && (
                    <foreignObject
                      width="100"
                      height="20"
                      transform="translate(-50,15)"
                      x={node.kx}
                      y={node.ky}
                    >
                      <p className="gphNode__label gphNode__label--html gphNoUserSelect">
                        {node.label}
                      </p>
                    </foreignObject>
                  )}

                  {node.numChildren > 0 && (
                    <g>
                      <circle
                        r="5"
                        className="gphNode__markerCircle"
                        transform="translate(10,10)"
                        cx={node.kx}
                        cy={node.ky}
                      />
                      <text
                        className="gphNode__markerText"
                        textAnchor="middle"
                        transform="translate(10,12)"
                        x={node.kx}
                        y={node.ky}
                      >
                        {node.numChildren}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
      </g>
    </svg>
  );
}
