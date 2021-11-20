const { CiStats } = require('kibana-buildkite-library');

(async () => {
  try {
    await CiStats.onStart();
  } catch (ex) {
    console.error('CI Stats Error', ex.message);
    if (ex.response) {
      console.error('HTTP Error Response Status', ex.response.status);
      console.error('HTTP Error Response Body', ex.response.data);
    }
    process.exit(1);
  }
})();
