/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import numeral from 'numeral';
import { PieContainsAllZeros, ContainerTooSmall } from '../errors';
import { Chart } from './_chart';
import { truncateLabel } from '../components/labels/truncate_labels';

const defaults = {
  isDonut: false,
  showTooltip: true,
  color: undefined,
  fillColor: undefined,
};
/**
 * Pie Chart Visualization
 *
 * @class PieChart
 * @constructor
 * @extends Chart
 * @param handler {Object} Reference to the Handler Class Constructor
 * @param el {HTMLElement} HTML element to which the chart will be appended
 * @param chartData {Object} Elasticsearch query results for this specific chart
 */
export class PieChart extends Chart {
  constructor(handler, chartEl, chartData, deps) {
    super(handler, chartEl, chartData, deps);
    const charts = this.handler.data.getVisData();
    this._validatePieData(charts);
    this._attr = _.defaults(handler.visConfig.get('chart', {}), defaults);
  }

  /**
   * Checks whether pie slices have all zero values.
   * If so, an error is thrown.
   */
  _validatePieData(charts) {
    const isAllZeros = charts.every(chart => {
      return chart.slices.children.length === 0;
    });

    if (isAllZeros) {
      throw new PieContainsAllZeros();
    }
  }

  /**
   * Adds Events to SVG paths
   *
   * @method addPathEvents
   * @param element {D3.Selection} Reference to SVG path
   * @returns {D3.Selection} SVG path with event listeners attached
   */
  addPathEvents(element) {
    const events = this.events;

    return element
      .call(events.addHoverEvent())
      .call(events.addMouseoutEvent())
      .call(events.addClickEvent());
  }

  convertToPercentage(slices) {
    (function assignPercentages(slices) {
      if (slices.sumOfChildren != null) return;

      const parent = slices;
      const children = parent.children;
      const parentPercent = parent.percentOfParent;

      const sum = (parent.sumOfChildren = Math.abs(
        children.reduce(function(sum, child) {
          return sum + Math.abs(child.size);
        }, 0)
      ));

      children.forEach(function(child) {
        child.percentOfGroup = Math.abs(child.size) / sum;
        child.percentOfParent = child.percentOfGroup;

        if (parentPercent != null) {
          child.percentOfParent *= parentPercent;
        }

        if (child.children) {
          assignPercentages(child);
        }
      });
    })(slices);
  }

  /**
   * Adds pie paths to SVG
   *
   * @method addPath
   * @param width {Number} Width of SVG
   * @param height {Number} Height of SVG
   * @param svg {HTMLElement} Chart SVG
   * @param slices {Object} Chart data
   * @returns {D3.Selection} SVG with paths attached
   */
  addPath(width, height, svg, slices) {
    const self = this;
    const marginFactor = 0.95;
    const isDonut = self._attr.isDonut;
    const radius = (Math.min(width, height) / 2) * marginFactor;
    const color = self.handler.data.getPieColorFunc();
    const tooltip = self.tooltip;
    const isTooltip = self._attr.addTooltip;

    const arcs = svg.append('g').attr('class', 'arcs');
    const labels = svg.append('g').attr('class', 'labels');

    const showLabels = self._attr.labels.show;
    const showValues = self._attr.labels.values;
    const truncateLabelLength = self._attr.labels.truncate;
    const showOnlyOnLastLevel = self._attr.labels.last_level;

    const partition = d3.layout
      .partition()
      .sort(null)
      .value(function(d) {
        return d.percentOfParent * 100;
      });

    const x = d3.scale.linear().range([0, 2 * Math.PI]);
    const y = d3.scale.sqrt().range([0, showLabels ? radius * 0.7 : radius]);

    const startAngle = function(d) {
      return Math.max(0, Math.min(2 * Math.PI, x(d.x)));
    };

    const endAngle = function(d) {
      if (d.dx < 1e-8) return x(d.x);
      return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx)));
    };

    const arc = d3.svg
      .arc()
      .startAngle(startAngle)
      .endAngle(endAngle)
      .innerRadius(function(d) {
        // option for a single layer, i.e pie chart
        if (d.depth === 1 && !isDonut) {
          // return no inner radius
          return 0;
        }

        return Math.max(0, y(d.y));
      })
      .outerRadius(function(d) {
        return Math.max(0, y(d.y + d.dy));
      });

    const outerArc = d3.svg
      .arc()
      .startAngle(startAngle)
      .endAngle(endAngle)
      .innerRadius(radius * 0.8)
      .outerRadius(radius * 0.8);

    let maxDepth = 0;
    const path = arcs
      .datum(slices)
      .selectAll('path')
      .data(partition.nodes)
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('class', function(d) {
        if (d.depth === 0) {
          return;
        }
        if (d.depth > maxDepth) maxDepth = d.depth;
        return 'slice';
      })
      .attr('data-test-subj', function(d) {
        if (d.name) {
          return `pieSlice-${d.name.split(' ').join('-')}`;
        }
      })
      .call(self._addIdentifier, 'name')
      .style('fill', function(d) {
        if (d.depth === 0) {
          return 'none';
        }
        return color(d.name);
      });

    // add labels
    if (showLabels) {
      const labelGroups = labels
        .datum(slices)
        .selectAll('.label')
        .data(partition.nodes);

      // create an empty quadtree to hold label positions
      const svgParentNode = svg.node().parentNode.parentNode;
      const svgBBox = {
        width: svgParentNode.clientWidth,
        height: svgParentNode.clientHeight,
      };

      const labelLayout = d3.geom
        .quadtree()
        .extent([
          [-svgBBox.width, -svgBBox.height],
          [svgBBox.width, svgBBox.height],
        ])
        .x(function(d) {
          return d.position.x;
        })
        .y(function(d) {
          return d.position.y;
        })([]);

      labelGroups
        .enter()
        .append('g')
        .attr('class', 'label')
        .append('text')
        .text(function(d) {
          if (d.depth === 0) {
            d3.select(this.parentNode).remove();
            return;
          }
          if (showValues) {
            const value = numeral(d.value / 100).format('0.[00]%');
            return `${d.name} (${value})`;
          }
          return d.name;
        })
        .text(function() {
          return truncateLabel(this, truncateLabelLength);
        })
        .attr('text-anchor', function(d) {
          const midAngle = startAngle(d) + (endAngle(d) - startAngle(d)) / 2;
          return midAngle < Math.PI ? 'start' : 'end';
        })
        .attr('class', 'label-text')
        .each(function resolveConflicts(d) {
          if (d.depth === 0) return;

          const parentNode = this.parentNode;
          if (showOnlyOnLastLevel && maxDepth !== d.depth) {
            d3.select(parentNode).remove();
            return;
          }

          const bbox = this.getBBox();
          const pos = outerArc.centroid(d);
          const midAngle = startAngle(d) + (endAngle(d) - startAngle(d)) / 2;
          pos[1] += 4;
          pos[0] = (0.7 + d.depth / 10) * radius * (midAngle < Math.PI ? 1 : -1);
          d.position = {
            x: pos[0],
            y: pos[1],
            left: midAngle < Math.PI ? pos[0] : pos[0] - bbox.width,
            right: midAngle > Math.PI ? pos[0] + bbox.width : pos[0],
            bottom: pos[1] + 5,
            top: pos[1] - bbox.height - 5,
          };

          const conflicts = [];
          labelLayout.visit(function(node) {
            if (!node.point) return;
            if (conflicts.length) return true;

            const point = node.point.position;
            const current = d.position;
            if (point) {
              const horizontalConflict =
                (point.left < 0 && current.left < 0) || (point.left > 0 && current.left > 0);
              const verticalConflict =
                (point.top >= current.top && point.top <= current.bottom) ||
                (point.top <= current.top && point.bottom >= current.top);

              if (horizontalConflict && verticalConflict) {
                point.point = node.point;
                conflicts.push(point);
              }

              return true;
            }
          });

          if (conflicts.length) {
            d3.select(parentNode).remove();
            return;
          }

          labelLayout.add(d);
        })
        .attr('x', function(d) {
          if (d.depth === 0 || !d.position) {
            return;
          }
          return d.position.x;
        })
        .attr('y', function(d) {
          if (d.depth === 0 || !d.position) {
            return;
          }
          return d.position.y;
        });

      labelGroups
        .append('polyline')
        .attr('points', function(d) {
          if (d.depth === 0 || !d.position) {
            return;
          }
          const pos1 = outerArc.centroid(d);
          const x2 = d.position.x > 0 ? d.position.x - 10 : d.position.x + 10;
          const pos2 = [x2, d.position.y - 4];
          pos1[1] = pos2[1];
          return [arc.centroid(d), pos1, pos2];
        })
        .attr('class', 'label-line');
    }

    if (isTooltip) {
      path.call(tooltip.render());
    }

    return path;
  }

  _validateContainerSize(width, height) {
    const minWidth = 20;
    const minHeight = 20;

    if (width <= minWidth || height <= minHeight) {
      throw new ContainerTooSmall();
    }
  }

  /**
   * Renders d3 visualization
   *
   * @method draw
   * @returns {Function} Creates the pie chart
   */
  draw() {
    const self = this;

    return function(selection) {
      selection.each(function(data) {
        const slices = data.slices;
        const div = d3.select(this);
        const width = $(this).width();
        const height = $(this).height();

        if (!slices.children.length) return;

        self.convertToPercentage(slices);
        self._validateContainerSize(width, height);

        const svg = div
          .append('svg')
          .attr('width', width)
          .attr('height', height)
          .attr('focusable', 'false')
          .append('g')
          .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');

        const path = self.addPath(width, height, svg, slices);
        self.addPathEvents(path);

        self.events.emit('rendered', {
          chart: data,
        });

        return svg;
      });
    };
  }
}
