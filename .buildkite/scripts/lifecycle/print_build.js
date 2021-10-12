const { BuildkiteClient } = require('kibana-buildkite-library');

(async () => {
  const client = new BuildkiteClient();
  const build = await client.getCurrentBuild();

  console.log(JSON.stringify(build, null, 2));
})();
