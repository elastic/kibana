const { BuildkiteClient } = require('kibana-buildkite-library');

(async () => {
  try {
    const client = new BuildkiteClient();
    const status = await client.getCurrentBuildStatus();
    console.log(status.success ? 'true' : 'false');
    process.exit(0);
  } catch (ex) {
    if (ex.response) {
      console.error('HTTP Error Response Body', ex.response.data);
      console.error('HTTP Error Response Status', ex.response.status);
    }
    console.error(ex);
    process.exit(1);
  }
})();
