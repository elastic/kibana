const fs = require('fs');
const path = require('path');

// get credentials from config file
const accessTokenFile = path.resolve(
  __dirname,
  './src/test/private/accessToken.txt'
);

const accessToken = fs
  .readFileSync(accessTokenFile, {
    encoding: 'utf-8',
  })
  .trim();

module.exports = {
  schema: 'github-schema.graphql',
  extensions: {
    endpoints: {
      'GitHub API V4': {
        url: 'https://api.github.com/graphql',
        headers: {
          Authorization: `token ${accessToken.trim()}`,
          'user-agent': 'JS GraphQL',
        },
      },
    },
  },
};
