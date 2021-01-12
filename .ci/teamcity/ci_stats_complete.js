const ciStats = require('./ci_stats');

// This might be better as an API call in the future.
// Instead, it relies on a separate step setting the BUILD_STATUS env var. BUILD_STATUS is not something provided by TeamCity.
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
