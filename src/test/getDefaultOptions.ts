import { BackportOptions } from '../options/options';

export function getDefaultOptions(options: Partial<BackportOptions> = {}) {
  return {
    repoOwner: 'elastic',
    repoName: 'kibana',
    accessToken: 'myAccessToken',
    username: 'sqren',
    author: 'sqren',
    githubApiBaseUrlV3: 'https://api.github.com',
    githubApiBaseUrlV4: 'https://api.github.com/graphql',
    ...options,
  } as BackportOptions;
}
