import { HandledError } from '../HandledError';
import { GithubApiError } from './GithubApiTypes';
import { logger } from '../logger';

export function handleGithubError(e: GithubApiError) {
  if (e.response && e.response.data) {
    logger.info(formatObject(e.config));
    logger.info(formatObject(e.response.headers));
    logger.info(formatObject(e.response.data));

    return new HandledError(
      formatObject({ ...e.response.data, axiosUrl: e.config.url })
    );
  }

  return e;
}

function formatObject(obj: Record<any, any>) {
  return JSON.stringify(obj, null, 2);
}
