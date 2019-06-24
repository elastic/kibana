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
import { getHeatmapColors } from '../../components/color/heatmap_color';


const defaultConfig = {
  showTooltip: true,
  percentageMode: true,
  maxAngle: 2 * Math.PI * 1.3,
  minAngle: 2 * Math.PI * 0.7,
  innerSpace: 5,
  extents: [0, 10000],
  scale: {
    show: true,
    color: '#666',
    width: 2,
    ticks: 10,
    tickLength: 8,
  },
  labels: {
    show: true,
    color: '#666'
  },
  style: {
    bgWidth: 0.5,
    width: 0.9
  }
};

export class MeterGauge {
  constructor(gaugeChart) {
    this.gaugeChart = gaugeChart;
    this.gaugeConfig = gaugeChart.gaugeConfig;
    this.gaugeConfig = _.defaultsDeep(this.gaugeConfig, defaultConfig);

    this.gaugeChart.handler.visConfig.set('legend', {
      labels: this.getLabels(),
      colors: this.getColors()
    });

    const colors = this.gaugeChart.handler.visConfig.get('legend.colors', null);
    if (colors) {
      this.gaugeChart.handler.vis.uiState.setSilent('vis.defaultColors', null);
      this.gaugeChart.handler.vis.uiState.setSilent('vis.defaultColors', colors);
    }

    this.colorFunc = this.gaugeChart.handler.data.getColorFunc();
  }

  getLabels() {
    const isPercentageMode = this.gaugeConfig.percentageMode;
    const colorsRange = this.gaugeConfig.colorsRange;
    const max = _.last(colorsRange).to;
    const labels = [];
    colorsRange.forEach(range => {
      const from = isPercentageMode ? Math.round(100 * range.from / max) : range.from;
      const to = isPercentageMode ? Math.round(100 * range.to / max) : range.to;
      labels.push(`${from} - ${to}`);
    });

    return labels;
  }

  getColors() {
    const invertColors = this.gaugeConfig.invertColors;
    const colorSchema = this.gaugeConfig.colorSchema;
    const colorsRange = this.gaugeConfig.colorsRange;
    const labels = this.getLabels();
    const colors = {};
    for (let i = 0; i < labels.length; i += 1) {
      const divider = Math.max(colorsRange.length - 1, 1);
      const val = invertColors ? 1 - i / divider : i / divider;
      colors[labels[i]] = getHeatmapColors(val, colorSchema);
    }
    return colors;
  }

  getBucket(val) {
    let bucket = _.findIndex(this.gaugeConfig.colorsRange, range => {
      return range.from <= val && range.to > val;
    });

    if (bucket === -1) {
      if (val < this.gaugeConfig.colorsRange[0].from) bucket = 0;
      else bucket = this.gaugeConfig.colorsRange.length - 1;
    }

    return bucket;
  }

  getLabel(val) {
    const bucket = this.getBucket(val);
    const labels = this.gaugeChart.handler.visConfig.get('legend.labels');
    return labels[bucket];
  }

  getColorBucket(val) {
    const bucket = this.getBucket(val);
    const labels = this.gaugeChart.handler.visConfig.get('legend.labels');
    return this.colorFunc(labels[bucket]);
  }

  drawScale(svg, radius, angle) {
    const scaleWidth = this.gaugeConfig.scale.width;
    const tickLength = this.gaugeConfig.scale.tickLength;
    const scaleTicks = this.gaugeConfig.scale.ticks;

    const scale = svg.append('g');

    this.gaugeConfig.colorsRange.forEach(range => {
      const color = this.getColorBucket(range.from);

      const scaleArc = d3.svg.arc()
        .startAngle(angle(range.from))
        .endAngle(angle(range.to))
        .innerRadius(radius)
        .outerRadius(radius + scaleWidth);

      scale
        .append('path')
        .attr('d', scaleArc)
        .style('stroke', color)
        .style('fill', color);
    });


    const extents = angle.domain();
    for (let i = 0; i <= scaleTicks; i++) {
      const val = i * (extents[1] - extents[0]) / scaleTicks;
      const tickAngle = angle(val) - Math.PI / 2;
      const x0 = Math.cos(tickAngle) * radius;
      const x1 = Math.cos(tickAngle) * (radius - tickLength);
      const y0 = Math.sin(tickAngle) * radius;
      const y1 = Math.sin(tickAngle) * (radius - tickLength);
      const color = this.getColorBucket(val);
      scale.append('line')
        .attr('x1', x0).attr('x2', x1)
        .attr('y1', y0).attr('y2', y1)
        .style('stroke-width', scaleWidth)
        .style('stroke', color);
    }

    return scale;
  }

  drawGauge(svg, data, width, height) {
    const self = this;
    const marginFactor = 0.95;
    const tooltip = this.gaugeChart.tooltip;
    const isTooltip = this.gaugeChart.handler.visConfig.get('addTooltip');
    const isDisplayWarning = this.gaugeChart.handler.visConfig.get('isDisplayWarning', false);
    const maxAngle = this.gaugeConfig.maxAngle;
    const minAngle = this.gaugeConfig.minAngle;
    const angleFactor = this.gaugeConfig.gaugeType === 'Arc' ? 0.75 : 1;
    const maxRadius = (Math.min(width, height / angleFactor) / 2) * marginFactor;

    const extendRange = this.gaugeConfig.extendRange;
    const maxY = _.max(data.values, 'y').y;
    const min = this.gaugeConfig.colorsRange[0].from;
    const max = _.last(this.gaugeConfig.colorsRange).to;
    const angle = d3.scale.linear()
      .range([minAngle, maxAngle])
      .domain([min, extendRange && max < maxY ? maxY : max]);
    const radius = d3.scale.linear()
      .range([0, maxRadius])
      .domain([this.gaugeConfig.innerSpace + 1, 0]);

    const totalWidth = Math.abs(radius(0) - radius(1));
    const bgPadding = totalWidth * (1 - this.gaugeConfig.style.bgWidth) / 2;
    const gaugePadding = totalWidth * (1 - this.gaugeConfig.style.width) / 2;

    /**
     * Function to calculate the free space in the center of the gauge. This takes into account
     * whether ticks are enabled or not.
     *
     * This is calculated using the inner diameter (radius(1) * 2) of the gauge.
     * If ticks/scale are enabled we need to still subtract the tick length * 2 to make space for a tick
     * on every side. If ticks/scale are disabled, the radius(1) function actually leaves space for the scale,
     * so we add that free space (which is expressed via the paddings, we just use the larger of those) to the diameter.
     */
    const getInnerFreeSpace = () => (radius(1) * 2) -
      (this.gaugeConfig.scale.show
        ? this.gaugeConfig.scale.tickLength * 2
        : -Math.max(bgPadding, gaugePadding) * 2
      );

    const arc = d3.svg.arc()
      .startAngle(minAngle)
      .endAngle(function (d) {
        return Math.max(0, Math.min(maxAngle, angle(Math.max(min, d.y))));
      })
      .innerRadius(function (d, i, j) {
        return Math.max(0, radius(j + 1) + gaugePadding);
      })
      .outerRadius(function (d, i, j) {
        return Math.max(0, radius(j) - gaugePadding);
      });

    const bgArc = d3.svg.arc()
      .startAngle(minAngle)
      .endAngle(maxAngle)
      .innerRadius(function (d, i, j) {
        return Math.max(0, radius(j + 1) + bgPadding);
      })
      .outerRadius(function (d, i, j) {
        return Math.max(0, radius(j) - bgPadding);
      });

    const gaugeHolders = svg
      .selectAll('path')
      .data([data])
      .enter()
      .append('g')
      .attr('data-label', (d) => this.getLabel(d.values[0].y));


    const gauges = gaugeHolders
      .selectAll('g')
      .data(d => d.values)
      .enter();


    gauges
      .append('path')
      .attr('d', bgArc)
      .style('fill', this.gaugeConfig.style.bgFill);

    const series = gauges
      .append('path')
      .attr('d', arc)
      .style('fill', function (d) {
        return self.getColorBucket(Math.max(min, d.y));
      });

    const smallContainer = svg.node().getBBox().height < 70;
    let hiddenLabels = smallContainer;

    // If the value label is hidden we later want to hide also all other labels
    // since they don't make sense as long as the actual value is hidden.
    let valueLabelHidden = false;

    gauges
      .append('text')
      .attr('class', 'chart-label')
      .attr('y', -5)
      .text(d => {
        if (this.gaugeConfig.percentageMode) {
          const percentage = Math.round(100 * (d.y - min) / (max - min));
          return `${percentage}%`;
        }
        return data.yAxisFormatter(d.y);
      })
      .attr('style', 'dominant-baseline: central;')
      .style('text-anchor', 'middle')
      .style('font-size', '2em')
      .style('display', function () {
        const textLength = this.getBBox().width;
        // The text is too long if it's larger than the inner free space minus a couple of random pixels for padding.
        const textTooLong = textLength >= getInnerFreeSpace() - 6;
        if (textTooLong) {
          hiddenLabels = true;
          valueLabelHidden = true;
        }
        return textTooLong ? 'none' : 'initial';
      });

    if (this.gaugeConfig.labels.show) {
      svg
        .append('text')
        .attr('class', 'chart-label')
        .text(data.label)
        .attr('y', -30)
        .attr('style', 'dominant-baseline: central; text-anchor: middle;')
        .style('display', function () {
          const textLength = this.getBBox().width;
          const textTooLong = textLength > maxRadius;
          if (textTooLong) {
            hiddenLabels = true;
          }
          return smallContainer || textTooLong ? 'none' : 'initial';
        });

      svg
        .append('text')
        .attr('class', 'chart-label')
        .text(this.gaugeConfig.style.subText)
        .attr('y', 20)
        .attr('style', 'dominant-baseline: central; text-anchor: middle;')
        .style('display', function () {
          const textLength = this.getBBox().width;
          const textTooLong = textLength > maxRadius;
          if (textTooLong) {
            hiddenLabels = true;
          }
          return valueLabelHidden || smallContainer || textTooLong ? 'none' : 'initial';
        });
    }

    if (this.gaugeConfig.scale.show) {
      this.drawScale(svg, radius(1), angle);
    }

    if (isTooltip) {
      series.each(function () {
        const gauge = d3.select(this);
        gauge.call(tooltip.render());
      });
    }

    if (hiddenLabels && isDisplayWarning) {
      this.gaugeChart.handler.alerts.show('Some labels were hidden due to size constraints');
    }

    //center the visualization
    const transformX = width / 2;
    const transformY = height / 2 > maxRadius ? height / 2 : maxRadius;

    svg.attr('transform', `translate(${transformX}, ${transformY})`);

    return series;
  }
}
