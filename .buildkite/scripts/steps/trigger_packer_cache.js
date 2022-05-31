const { BuildkiteClient } = require('kibana-buildkite-library');

(async () => {
  try {
    const client = new BuildkiteClient();
    const build = await client.triggerBuild('kibana-agent-packer-cache', {
      commit: 'HEAD',
      branch: 'main',
      ignore_pipeline_branch_filters: true, // Required because of a Buildkite bug
    });
    console.log(`Triggered build: ${build.web_url}`);
    process.exit(0);
  } catch (ex) {
    console.error('Buildkite API Error', ex.toString());
    if (ex.response) {
      console.error('HTTP Error Response Status', ex.response.status);
      console.error('HTTP Error Response Body', ex.response.data);
    }
    process.exit(1);
  }
})();
