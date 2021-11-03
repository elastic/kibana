const execSync = require('child_process').execSync;
const fs = require('fs');
const path = require('path');

// TODO - how to generate this dynamically?
const STORYBOOKS = [
  'apm',
  'canvas',
  'codeeditor',
  'ci_composite',
  'custom_integrations',
  'url_template_editor',
  'dashboard',
  'dashboard_enhanced',
  'data_enhanced',
  'embeddable',
  'expression_error',
  'expression_image',
  'expression_metric',
  'expression_repeat_image',
  'expression_reveal_image',
  'expression_shape',
  'expression_tagcloud',
  'fleet',
  'infra',
  'security_solution',
  'ui_actions_enhanced',
  'observability',
  'presentation',
  'lists',
];

const GITHUB_CONTEXT = 'Build and Publish Storybooks';

const STORYBOOK_DIRECTORY =
  process.env.BUILDKITE_PULL_REQUEST && process.env.BUILDKITE_PULL_REQUEST !== 'false'
    ? `pr-${process.env.BUILDKITE_PULL_REQUEST}`
    : process.env.BUILDKITE_BRANCH.replace('/', '__');
const STORYBOOK_BUCKET = 'ci-artifacts.kibana.dev/storybooks';
const STORYBOOK_BUCKET_URL = `https://${STORYBOOK_BUCKET}/${STORYBOOK_DIRECTORY}`;
const STORYBOOK_BASE_URL = `${STORYBOOK_BUCKET_URL}/${process.env.BUILDKITE_COMMIT}`;

const exec = (...args) => execSync(args.join(' '), { stdio: 'inherit' });

const ghStatus = (state, description) =>
  exec(
    `gh api "repos/elastic/kibana/statuses/${process.env.BUILDKITE_COMMIT}"`,
    `-f state=${state}`,
    `-f target_url="${process.env.BUILDKITE_BUILD_URL}"`,
    `-f context="${GITHUB_CONTEXT}"`,
    `-f description="${description}"`,
    `--silent`
  );

const build = () => {
  console.log('--- Building Storybooks');

  for (const storybook of STORYBOOKS) {
    exec(`STORYBOOK_BASE_URL=${STORYBOOK_BASE_URL}`, `yarn storybook --site ${storybook}`);
  }
};

const upload = () => {
  const originalDirectory = process.cwd();
  try {
    console.log('--- Generating Storybooks HTML');

    process.chdir(path.join('.', 'built_assets', 'storybook'));
    fs.renameSync('ci_composite', 'composite');

    const storybooks = execSync(`ls -1d */`)
      .toString()
      .trim()
      .split('\n')
      .map((path) => path.replace('/', ''))
      .filter((path) => path != 'composite');

    const listHtml = storybooks
      .map((storybook) => `<li><a href="${STORYBOOK_BASE_URL}/${storybook}">${storybook}</a></li>`)
      .join('\n');

    const html = `
      <html>
        <body>
          <h1>Storybooks</h1>
          <p><a href="${STORYBOOK_BASE_URL}/composite">Composite Storybook</a></p>
          <h2>All</h2>
          <ul>
            ${listHtml}
          </ul>
        </body>
      </html>
    `;

    fs.writeFileSync('index.html', html);

    console.log('--- Uploading Storybooks');
    exec(`
      gsutil -q -m cp -r -z js,css,html,json,map,txt,svg '*' 'gs://${STORYBOOK_BUCKET}/${STORYBOOK_DIRECTORY}/${process.env.BUILDKITE_COMMIT}/'
      gsutil -h "Cache-Control:no-cache, max-age=0, no-transform" cp -z html 'index.html' 'gs://${STORYBOOK_BUCKET}/${STORYBOOK_DIRECTORY}/latest/'
    `);

    if (process.env.BUILDKITE_PULL_REQUEST && process.env.BUILDKITE_PULL_REQUEST !== 'false') {
      exec(
        `buildkite-agent meta-data set pr_comment:storybooks:head '* [Storybooks Preview](${STORYBOOK_BASE_URL})'`
      );
    }
  } finally {
    process.chdir(originalDirectory);
  }
};

try {
  ghStatus('pending', 'Building Storybooks');
  build();
  upload();
  ghStatus('success', 'Storybooks built');
} catch (error) {
  ghStatus('error', 'Building Storybooks failed');
  throw error;
}
