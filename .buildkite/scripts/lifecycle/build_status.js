const { BuildkiteClient } = require('kibana-buildkite-library');

(async () => {
  try {
    const client = new BuildkiteClient();
    const status = await client.getCurrentBuildStatus();
    if (status.success) {
      console.log('true');
      process.exit(0);
    } else {
      console.log('false');
      process.exit(1);
    }
  } catch (ex) {
    console.error(ex);
    process.exit(1);
  }
})();
