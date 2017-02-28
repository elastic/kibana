import _ from 'lodash';
import getAggValue from './get_agg_value';
import buildProcessorFunction from './build_processor_function';
import basicAggs from '../../../public/components/lib/basic_aggs';
import calculateLabel from '../../../public/components/lib/calculate_label';
import Color from 'color';
import getDefaultDecoration from './get_default_decoration';
import mapBucket from './map_bucket';

import processors from './response_processors/series';

export default function handleResponseBody(panel) {
  return resp => {
    if (resp.error) {
      const err = new Error(resp.error.type);
      err.response = JSON.stringify(resp);
      throw err;
    }
    const keys = Object.keys(resp.aggregations);
    if (keys.length !== 1) throw Error('There should only be one series per request.');
    const seriesId = keys[0];
    const series = panel.series.find(s => s.id === seriesId);
    const processor = buildProcessorFunction(processors, resp, panel, series);
    return processor([]);
  };
}
