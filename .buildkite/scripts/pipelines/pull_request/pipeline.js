const execSync = require('child_process').execSync;
const fs = require('fs');
const { areChangesSkippable, doAnyChangesMatch } = require('kibana-buildkite-library');

const SKIPPABLE_PATHS = [
  /^docs\//,
  /^rfcs\//,
  /^.ci\/.+\.yml$/,
  /^.ci\/es-snapshots\//,
  /^.ci\/pipeline-library\//,
  /^.ci\/Jenkinsfile_[^\/]+$/,
  /^\.github\//,
  /\.md$/,
  /^\.backportrc\.json$/,
];

const REQUIRED_PATHS = [
  // this file is auto-generated and changes to it need to be validated with CI
  /^docs\/developer\/plugin-list.asciidoc$/,
  // don't skip CI on prs with changes to plugin readme files /i is for case-insensitive matching
  /\/plugins\/[^\/]+\/readme\.(md|asciidoc)$/i,
];

const getPipeline = (filename, removeSteps = true) => {
  const str = fs.readFileSync(filename).toString();
  return removeSteps ? str.replace(/^steps:/, '') : str;
};

const uploadPipeline = (pipelineContent) => {
  const str =
    typeof pipelineContent === 'string' ? pipelineContent : JSON.stringify(pipelineContent);

  execSync('buildkite-agent pipeline upload', {
    input: str,
    stdio: ['pipe', 'inherit', 'inherit'],
  });
};

(async () => {
  try {
    const skippable = await areChangesSkippable(SKIPPABLE_PATHS, REQUIRED_PATHS);

    if (skippable) {
      console.log('All changes in PR are skippable. Skipping CI.');

      // Since we skip everything, including post-build, we need to at least make sure the commit status gets set
      execSync('BUILD_SUCCESSFUL=true .buildkite/scripts/lifecycle/commit_status_complete.sh', {
        stdio: 'inherit',
      });
      process.exit(0);
    }

    const pipeline = [];

    pipeline.push(getPipeline('.buildkite/pipelines/pull_request/base.yml', false));

    if (
      await doAnyChangesMatch([
        /^x-pack\/plugins\/security_solution/,
        /^x-pack\/test\/security_solution_cypress/,
        /^x-pack\/plugins\/triggers_actions_ui\/public\/application\/sections\/action_connector_form/,
        /^x-pack\/plugins\/triggers_actions_ui\/public\/application\/context\/actions_connectors_context\.tsx/,
      ])
    ) {
      pipeline.push(getPipeline('.buildkite/pipelines/pull_request/security_solution.yml'));
    }

    // Disabled for now, these are failing/disabled in Jenkins currently as well
    // if (
    //   await doAnyChangesMatch([
    //     /^x-pack\/plugins\/apm/,
    //   ])
    // ) {
    //   pipeline.push(getPipeline('.buildkite/pipelines/pull_request/apm_cypress.yml'));
    // }

    pipeline.push(getPipeline('.buildkite/pipelines/pull_request/post_build.yml'));

    uploadPipeline(pipeline.join('\n'));
  } catch (ex) {
    console.error('PR pipeline generation error', ex.message);
    process.exit(1);
  }
})();
