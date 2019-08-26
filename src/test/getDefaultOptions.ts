import { BackportOptions } from '../options/options';

export function getDefaultOptions(options: Partial<BackportOptions> = {}) {
  return {
    repoOwner: 'elastic',
    repoName: 'kibana',
    accessToken: 'myAccessToken',
    username: 'sqren',
    author: 'sqren',
    apiHostname: 'api.github.com',
    ...options
  } as BackportOptions;
}
