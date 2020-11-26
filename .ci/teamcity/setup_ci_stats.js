const ciStats = require('./ci_stats');

(async () => {
  try {
    const build = await ciStats.post('/v1/build', {
      jenkinsJobName: process.env.TEAMCITY_BUILDCONF_NAME,
      jenkinsJobId: process.env.TEAMCITY_BUILD_ID,
      jenkinsUrl: process.env.TEAMCITY_BUILD_URL,
      prId: process.env.GITHUB_PR_NUMBER || null,
    });

    const config = {
      apiUrl: `https://${process.env.CI_STATS_HOST}`,
      apiToken: process.env.CI_STATS_TOKEN,
      buildId: build.id,
    };

    const configJson = JSON.stringify(config);
    process.env.KIBANA_CI_STATS_CONFIG = configJson;
    console.log(`\n##teamcity[setParameter name='env.KIBANA_CI_STATS_CONFIG' display='hidden' password='true' value='${configJson}']\n`);
    console.log(`\n##teamcity[setParameter name='env.CI_STATS_BUILD_ID' value='${build.id}']\n`);

    await ciStats.post(`/v1/git_info?buildId=${build.id}`, {
      branch: process.env.GIT_BRANCH.replace(/^(refs\/heads\/|origin\/)/, ''),
      commit: process.env.GIT_COMMIT,
      targetBranch: process.env.GITHUB_PR_TARGET_BRANCH || null,
      mergeBase: null, // TODO
    });
  } catch (ex) {
    console.error(ex);
    process.exit(1);
  }
})();
