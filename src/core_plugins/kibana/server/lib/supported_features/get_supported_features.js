import { checkFieldStatsApi } from './feature_checks';


const featureChecks = [
  checkFieldStatsApi,
];

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

  const featureFlags = featureChecks.reduce((featureFlags, featureCheck) => (
    featureCheck(clusterInfo, featureFlags)
  ), {});

  return featureFlags;
}
