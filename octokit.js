const { Octokit } = require('@octokit/rest');
const github = new Octokit({ auth: process.env.GITHUB_TOKEN });
async function main() {
const content = await github.rest.repos.getContent({
    mediaType: {
      format: 'application/vnd.github.VERSION.raw',
    },
    owner: 'elastic',
    repo: 'kibana',
    path: '/FAQ.md',
    ref: '9.1',
  });
  console.log(content);
}

main();
