import { CiStatsClient } from './client';

const ciStats = new CiStatsClient();

export async function onMetricsViable() {
  if (!process.env.CI_STATS_BUILD_ID) {
    return;
  }

  console.log('Marking build as a "valid baseline" so that it can be used to power PR reports');
  await ciStats.markBuildAsValidBaseline(process.env.CI_STATS_BUILD_ID);
}
