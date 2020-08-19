const ciStats = require('./ci_stats');

(async () => {
  try {
    const build = await ciStats.post('/v1/build', {
      jenkinsJobName: process.env.TEAMCITY_BUILDCONF_NAME,
      jenkinsJobId: process.env.TEAMCITY_BUILD_ID,
      jenkinsUrl: process.env.TEAMCITY_BUILD_URL,
      prId: null,
    });

    const config = {
      apiUrl: `https://${process.env.CI_STATS_HOST}`,
      apiToken: process.env.CI_STATS_TOKEN,
      buildId: build.id,
    };

    const configJson = JSON.stringify(config);
    process.env.KIBANA_CI_STATS_CONFIG = configJson;
    console.log(`\n##teamcity[setParameter name='env.KIBANA_CI_STATS_CONFIG' value='${configJson}' display='hidden' password='true']\n`);
  } catch (ex) {
    console.error(ex);
    process.exit(1);
  }
})();

// TODO add git info
// then add end build script
