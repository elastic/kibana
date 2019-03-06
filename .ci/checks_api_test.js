const Octokit = require('@octokit/rest')

/*
octokit.repos.listForOrg({
  org: 'octokit',
  type: 'public'
}).then(({data}) => {
  console.log('data: ', data);
})
*/
export function getGithubClient() {
  const client = new Octokit();
  client.authenticate({
    type: 'token',
    token: process.env.GITHUB_TOKEN
  });

  return client;
}

const client = getGithubClient();

client.repos.listForOrg({
  org: 'octokit',
  type: 'public'
}).then(({data}) => {
  console.log('data: ', data);
})

console.log('hi from script');
