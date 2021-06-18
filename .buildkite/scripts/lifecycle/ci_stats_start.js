const { execSync } = require('child_process');
const ciStats = require('./ci_stats');

(async () => {
  try {
    const build = await ciStats.post('/v1/build', {
      jenkinsJobName: process.env.BUILDKITE_PIPELINE_NAME,
      jenkinsJobId: process.env.BUILDKITE_BUILD_ID,
      jenkinsUrl: process.env.BUILDKITE_BUILD_URL,
      prId: process.env.GITHUB_PR_NUMBER || null,
    });

    execSync(`buildkite-agent meta-data set ci_stats_build_id "${build.id}"`);

    // TODO Will need to set MERGE_BASE for PRs

    await ciStats.post(`/v1/git_info?buildId=${build.id}`, {
      branch: process.env.BUILDKITE_BRANCH.replace(/^(refs\/heads\/|origin\/)/, ''),
      commit: process.env.BUILDKITE_COMMIT,
      targetBranch:
        process.env.GITHUB_PR_TARGET_BRANCH ||
        process.env.BUILDKITE_PULL_REQUEST_BASE_BRANCH ||
        null,
      mergeBase: process.env.GITHUB_PR_MERGE_BASE || null, // TODO confirm GITHUB_PR_MERGE_BASE or switch to final var
    });
  } catch (ex) {
    console.error(ex);
    process.exit(1);
  }
})();
