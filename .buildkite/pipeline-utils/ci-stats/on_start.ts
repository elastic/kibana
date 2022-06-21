import { execSync } from 'child_process';
import { CiStatsClient } from './client';

const ciStats = new CiStatsClient();

export async function onStart() {
  const build = await ciStats.createBuild();
  execSync(`buildkite-agent meta-data set ci_stats_build_id "${build.id}"`);
  await ciStats.addGitInfo(build.id);
}
