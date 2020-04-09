import Axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { HandledError } from '../../HandledError';
import { logger } from '../../logger';

// Docs: https://developer.github.com/v3/#client-errors
export type GithubV3Error = AxiosError<{
  message: string;
  errors?: Array<{
    resource: string;
    code: string;
    field: string;
    message?: string;
  }>;
  documentation_url: string;
}>;

export async function apiRequestV3<T>(config: AxiosRequestConfig) {
  try {
    const response = await Axios.request<T>(config);

    logger.info(
      `${config.method?.toUpperCase()} ${config.url} (status: ${
        response?.status
      })`
    );
    logger.debug('Response headers:', response.headers);
    logger.verbose('Response data:', response.data);

    return response.data;
  } catch (ex) {
    const e = ex as GithubV3Error;

    logger.info(
      `${config.method?.toUpperCase()} ${config.url} (status: ${
        e.response?.status
      })`
    );
    logger.info('Response headers:', e.response?.headers);
    logger.info('Response data:', e.response?.data);

    throw handleGithubV3Error(e);
  }
}

export function handleGithubV3Error(e: GithubV3Error) {
  if (!e.response?.data) {
    return e;
  }

  const errorMessages = e.response.data.errors?.map((error) => error.message);
  if (errorMessages) {
    return new HandledError(
      `${e.response.data.message}: ${errorMessages.join(', ')} (Github v3)`
    );
  }

  if (e.response.data.message) {
    return new HandledError(`${e.response.data.message} (Github v3)`);
  }

  return new HandledError(
    `Unexpected response from Github API (v3):\n${JSON.stringify(
      e.response.data,
      null,
      2
    )}`
  );
}
