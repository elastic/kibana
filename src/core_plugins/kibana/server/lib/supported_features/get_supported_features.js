import _ from 'lodash';
import { checkFieldStatsApi } from './feature_checks';


const featureChecks = {
  field_stats_api: checkFieldStatsApi,
};

export async function getSupportedFeatures(callWithRequest) {
  const { nodes: nodesInfo } = await callWithRequest('nodes.info', {
    filterPath: [
      'nodes.*.name',
      'nodes.*.version',
    ],
  });

  const clusterInfo = {
    nodes: nodesInfo,
  };

  const featureFlags = _.mapValues(featureChecks, (featureCheck) => (
    featureCheck(clusterInfo)
  ));

  return featureFlags;
}
