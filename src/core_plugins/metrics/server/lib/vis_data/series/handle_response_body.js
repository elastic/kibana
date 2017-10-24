import buildProcessorFunction from '../build_processor_function';
import processors from '../response_processors/series';
import { get } from 'lodash';

export default function handleResponseBody(panel) {
  return resp => {
    if (resp.error) {
      const err = new Error(resp.error.type);
      err.response = JSON.stringify(resp);
      throw err;
    }
    const aggregations = get(resp, 'aggregations');
    if (!aggregations) {
      const message = `The aggregations key is missing from the response,
        check your permissions for this request.`;
      throw Error(message);
    }
    const keys = Object.keys(aggregations);
    if (keys.length !== 1) throw Error('There should only be one series per request.');
    const seriesId = keys[0];
    const series = panel.series.find(s => s.id === seriesId);
    const processor = buildProcessorFunction(processors, resp, panel, series);
    return processor([]);
  };
}
