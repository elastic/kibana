import buildProcessorFunction from '../build_processor_function';
import processors from '../response_processors/table';
import { first } from 'lodash';
export default function processBucket(panel) {
  return bucket => {
    const series = panel.series.map(series => {
      const processor = buildProcessorFunction(processors, bucket, panel, series);
      return first(processor([]));
    });
    return { key: bucket.key, series };
  };
}
