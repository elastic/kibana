const ciStats = require('./ci_stats');

// TODO - this is okay for now but should really be replaced with an API call, especially once retries are enabled
const BUILD_STATUS = process.env.BUILD_FAILED === 'true' ? 'FAILURE' : 'SUCCESS';

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
