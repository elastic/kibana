import _ from 'lodash';
import moment from 'moment';
import Color from 'color';
import calculateAuto from '../../public/visualizations/lib/calculate_auto';
import calculateLabel from '../../public/components/vis_editor/lib/calculate_label';
import basicAggs from '../../public/lib/basic_aggs';
import bucketTransform from './bucket_transform';
import calculateIndices from './calculate_indices';
import extendStatsTypes from './extended_stats_types';
import getAggValue from './get_agg_value';
import getBucketsPath from './get_buckets_path';
import getSiblingAggValue from './get_sibling_agg_value';
import SeriesAgg from './series_agg';
import unitToSeconds from './unit_to_seconds';

import getRequestParams from './vis_data/get_request_params';
import handleResponse from './vis_data/handle_response';
import handleErrorResponse from './vis_data/handle_error_response';

function getPanelData(req) {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('data');
  return panel => {
    const { index_pattern, time_field } = panel;
    return calculateIndices(req, index_pattern, time_field).then(indices => {
      const params = getRequestParams(req, panel, indices);
      return callWithRequest(req, 'msearch', params)
        .then(resp => {
          const result = {};
          result[panel.id] = {
            id: panel.id,
            series: resp.responses
              .map(handleResponse(panel))
              .reduce((acc, data) => {
                return acc.concat(data);
              }, [])
          };
          return result;
        })
        .catch(handleErrorResponse(panel));
    });
  };
}

function getVisData(req) {
  const reqs = req.payload.panels.map(getPanelData(req));
  return Promise.all(reqs)
    .then(res => {
      return res.reduce((acc, data) => {
        return _.assign({}, acc, data);
      }, {});
    });
}

export default getVisData;

