import buildProcessorFunction from '../build_processor_function';
import processors from '../response_processors/table';
import getLastValue from '../../../../common/get_last_value';
import regression from 'regression';
import { first, get } from 'lodash';
export default function processBucket(panel) {
  return bucket => {
    const series = panel.series.map(series => {
      const processor = buildProcessorFunction(processors, bucket, panel, series);
      const result = first(processor([]));
      if (!result) return null;
      const data = get(result, 'data', []);
      const linearRegression = regression.linear(data);
      result.last = getLastValue(data);
      result.slope = linearRegression.equation[0];
      return result;
    });
    return { key: bucket.key, series };
  };
}
