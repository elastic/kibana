/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Query the GitHub API for the user's GitHub identity
import { octokit } from './shared';

const getGitHubIdentity = async (): Promise<{
  login: string;
  name: string | null;
  email: string | null;
}> => {
  const { data } = await octokit.users.getAuthenticated();

  return {
    login: data.login,
    name: data.name,
    email: data.email,
  };
};

async function main() {
  try {
    const identity = await getGitHubIdentity();

    if (!identity.name) {
      identity.name = identity.login;
    }

    if (!identity.email) {
      identity.email = `${identity.login}@elastic.co`;
    }

    return identity;
  } catch (error) {
    console.error(error);

    return {
      login: 'unknown-user',
      name: 'Unknown User',
      email: 'unknown-user@elastic.co',
    };
  }
}

if (require.main === module) {
  main().then((identity) => {
    console.log(JSON.stringify(identity));
  });
} else {
  module.exports = main;
}
