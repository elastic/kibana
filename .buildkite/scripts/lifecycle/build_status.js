const { BuildkiteClient } = require('kibana-buildkite-library');

(async () => {
  try {
    const client = new BuildkiteClient();
    const status = await client.getCurrentBuildStatus();
    console.log(status.success ? 'true' : 'false');
    process.exit(0);
  } catch (ex) {
    console.error('Buildkite API Error', ex.message);
    if (ex.response) {
      console.error('HTTP Error Response Status', ex.response.status);
      console.error('HTTP Error Response Body', ex.response.data);
    }
    process.exit(1);
  }
})();
