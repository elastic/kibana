require('dotenv').config();

const accessToken = process.env.ACCESS_TOKEN;

module.exports = {
  schema: 'github-schema.graphql',
  extensions: {
    endpoints: {
      'GitHub API V4': {
        url: 'https://api.github.com/graphql',
        headers: {
          Authorization: `token ${accessToken}`,
          'user-agent': 'JS GraphQL',
        },
      },
    },
  },
};
