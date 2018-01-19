import _ from 'lodash';
import { getHeatmapColors } from 'ui/vislib/components/color/heatmap_color';

export class MetricVisController {

  _getLabels() {
    const config = this._vis.params.metric;
    const isPercentageMode = config.percentageMode;
    const colorsRange = config.colorsRange;
    const max = _.last(colorsRange).to;
    const labels = [];
    colorsRange.forEach(range => {
      const from = isPercentageMode ? Math.round(100 * range.from / max) : range.from;
      const to = isPercentageMode ? Math.round(100 * range.to / max) : range.to;
      labels.push(`${from} - ${to}`);
    });

    return labels;
  }

  _getColors() {
    const config = this._vis.params.metric;
    const invertColors = config.invertColors;
    const colorSchema = config.colorSchema;
    const colorsRange = config.colorsRange;
    const labels = this._getLabels();
    const colors = {};
    for (let i = 0; i < labels.length; i += 1) {
      const divider = Math.max(colorsRange.length - 1, 1);
      const val = invertColors ? 1 - i / divider : i / divider;
      colors[labels[i]] = getHeatmapColors(val, colorSchema);
    }
    return colors;
  }

  _getBucket(val) {
    const config = this._vis.params.metric;
    let bucket = _.findIndex(config.colorsRange, range => {
      return range.from <= val && range.to > val;
    });

    if (bucket === -1) {
      if (val < config.colorsRange[0].from) bucket = 0;
      else bucket = config.colorsRange.length - 1;
    }

    return bucket;
  }

  _getColor(val, labels, colors) {
    const bucket = this._getBucket(val);
    const label = labels[bucket];
    return colors[label];
  }

  _processTableGroups(tableGroups) {
    const config = this._vis.params.metric;
    const isPercentageMode = config.percentageMode;
    const min = config.colorsRange[0].from;
    const max = _.last(config.colorsRange).to;
    const colors = this._getColors();
    const labels = this._getLabels();
    const metrics = [];

    tableGroups.tables.forEach((table) => {
      let bucketAgg;

      table.columns.forEach((column, i) => {
        const aggConfig = column.aggConfig;

        if (aggConfig && aggConfig.schema.group === 'buckets') {
          bucketAgg = aggConfig;
          return;
        }

        table.rows.forEach(row => {

          let title = column.title;
          let value = row[i];
          const color = this._getColor(value, labels, colors);

          if (isPercentageMode) {
            const percentage = Math.round(100 * (value - min) / (max - min));
            value = `${percentage}%`;
          }

          if (aggConfig) {
            if (!isPercentageMode) value = aggConfig.fieldFormatter('html')(value);
            if (bucketAgg) {
              const bucketValue = bucketAgg.fieldFormatter('text')(row[0]);
              title = `${bucketValue} - ${aggConfig.makeLabel()}`;
            } else {
              title = aggConfig.makeLabel();
            }
          }

          const shouldColor = config.colorsRange.length > 1;

          metrics.push({
            label: title,
            value: value,
            color: shouldColor && config.style.labelColor ? color : null,
            bgColor: shouldColor && config.style.bgColor ? color : null
          });
        });
      });
    });

    return metrics;
  }


  constructor(node, vis) {
    this._vis = vis;
    this._containerNode = document.createElement('div');
    this._containerNode.className = 'metric-vis';
    node.appendChild(this._containerNode);
  }

  async render(data) {
    this._containerNode.innerHTML = '';
    if (data) {
      const metrics = this._processTableGroups(data);
      metrics.forEach(metric => {
        const metricDiv = document.createElement('div');
        metricDiv.className = 'metric-container';
        metricDiv.style['background-color'] = metric.bgColor;

        metricDiv.innerHTML = `
          <div class="metric-value"
               style="font-size: ${this._vis.params.metric.style.fontSize}pt; color: ${metric.color}"
          >${metric.value}</div>`;

        if (this._vis.params.metric.labels.show) {
          const labelDiv = document.createElement('div');
          labelDiv.innerHTML = metric.label;
          metricDiv.appendChild(labelDiv);
        }

        this._containerNode.appendChild(metricDiv);
      });
    }
  }
}
