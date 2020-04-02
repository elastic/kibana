import { HandledError } from '../HandledError';
import { GithubApiError } from './GithubApiTypes';
import { logger } from '../logger';

export function handleGithubError(e: GithubApiError) {
  if (e.response?.data) {
    logger.info('API v3 config', e.config);
    logger.info('API v3 response headers', e.response.headers);
    logger.info('API v3 response data', e.response.data);

    const errorMessages = e.response.data.errors?.map((error) => error.message);
    if (errorMessages) {
      return new HandledError(errorMessages.join(','));
    }

    return new HandledError(
      JSON.stringify({ ...e.response.data, axiosUrl: e.config.url }, null, 2)
    );
  }

  return e;
}
