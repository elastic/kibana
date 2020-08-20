const ciStats = require('./ci_stats');

// TODO this should be a TeamCity REST API call
const BUILD_STATUS = process.env.BUILD_STATUS === 'SUCCESS' ? 'SUCCESS' : 'FAILURE';

(async () => {
  try {
    if (process.env.CI_STATS_BUILD_ID) {
      await ciStats.post(`/v1/build/_complete?id=${process.env.CI_STATS_BUILD_ID}`, {
        result: BUILD_STATUS,
      });
    }
  } catch (ex) {
    console.error(ex);
    process.exit(1);
  }
})();
