const { CiStats } = require('kibana-buildkite-library');

(async () => {
  try {
    await CiStats.onStart();
  } catch (ex) {
    console.error(ex);
    process.exit(1);
  }
})();
