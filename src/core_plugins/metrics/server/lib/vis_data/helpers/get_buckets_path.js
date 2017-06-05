import _ from 'lodash';
export default (id, metrics) => {
  const metric = _.find(metrics, { id });
  let bucketsPath = String(id);

  switch (metric.type) {
    case 'derivative':
      bucketsPath += '[normalized_value]';
      break;
    case 'percentile':
      const percentileKey = /\./.test(`${metric.percent}`) ? `${metric.percent}` : `${metric.percent}.0`;
      bucketsPath += `[${percentileKey}]`;
      break;
    case 'percentile_rank':
      bucketsPath += `[${metric.value}]`;
      break;
    case 'std_deviation':
    case 'variance':
    case 'sum_of_squares':
      if (/^std_deviation/.test(metric.type) && ~['upper','lower'].indexOf(metric.mode)) {
        bucketsPath += `[std_${metric.mode}]`;
      } else {
        bucketsPath += `[${metric.type}]`;
      }
      break;
  }


  return bucketsPath;
};

