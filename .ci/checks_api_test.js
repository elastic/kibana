const Octokit = require('@octokit/rest')
const octokit = new Octokit ();

octokit.repos.listForOrg({
  org: 'octokit',
  type: 'public'
}).then(({data}) => {
  console.log('data: ', data);
})

console.log('hi from script');
