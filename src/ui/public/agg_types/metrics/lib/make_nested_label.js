import _ from 'lodash';

const makeNestedLabel = function (aggConfig, label) {
  const uppercaseLabel = _.startCase(label);
  if (aggConfig.params.customMetric) {
    let metricLabel = aggConfig.params.customMetric.makeLabel();
    if (metricLabel.includes(`${uppercaseLabel} of `)) {
      metricLabel = metricLabel.substring(`${uppercaseLabel} of `.length);
      metricLabel = `2. ${label} of ${metricLabel}`;
    }
    else if (metricLabel.includes(`${label} of `)) {
      metricLabel = (parseInt(metricLabel.substring(0, 1)) + 1) + metricLabel.substring(1);
    }
    else {
      metricLabel = `${uppercaseLabel} of ${metricLabel}`;
    }
    return metricLabel;
  }
  const metric = aggConfig.vis.aggs.find(agg => agg.id === aggConfig.params.metricAgg);
  return `${uppercaseLabel} of ${metric.makeLabel()}`;
};

export { makeNestedLabel };
