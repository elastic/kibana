import _ from 'lodash';
import semver from 'semver';


export function checkFieldStatsApi(clusterInfo, featureFlags) {
  const nodesWithoutFieldStats = _.filter(clusterInfo.nodes, ({ version }) => (
    semver.major(version) >= 6
  ));

  const reasons = nodesWithoutFieldStats.map(({ name }) => (
    `A node in the cluster does not support the api: ${name}`
  ));

  return {
    ...featureFlags,
    field_stats_api: {
      reasons,
      supported: reasons.length === 0,
    }
  };
}
