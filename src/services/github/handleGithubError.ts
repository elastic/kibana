import { HandledError } from '../HandledError';
import { GithubApiError } from './GithubApiTypes';

export function handleGithubError(e: GithubApiError) {
  if (e.response && e.response.data) {
    return new HandledError(
      JSON.stringify({ ...e.response.data, axiosUrl: e.config.url }, null, 4)
    );
  }

  return e;
}
