const { CiStats } = require('kibana-buildkite-library');

(async () => {
  try {
    await CiStats.onComplete();
  } catch (ex) {
    console.error(ex);
    process.exit(1);
  }
})();
