import axios from 'axios';
import { AxiosError } from 'axios';
import { HandledError } from '../../HandledError';
import { logger } from '../../logger';

export interface GithubV4Response<DataResponse> {
  data: DataResponse;
  errors?: {
    type: string;
    path: string[];
    locations: {
      line: number;
      column: number;
    }[];
    message: string;
  }[];
}

export async function apiRequestV4<DataResponse>({
  githubApiBaseUrlV4,
  accessToken,
  query,
  variables,
  handleError = true,
}: {
  githubApiBaseUrlV4: string;
  accessToken: string;
  query: string;
  variables?: {
    [key: string]: string | number | null;
  };
  handleError?: boolean;
}) {
  try {
    const response = await axios.post<GithubV4Response<DataResponse>>(
      githubApiBaseUrlV4,
      { query, variables },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `bearer ${accessToken}`,
        },
      }
    );

    if (response.data.errors) {
      const newError = new Error();
      //@ts-ignore
      newError.response = response;
      throw newError;
    }

    logger.info(`POST ${githubApiBaseUrlV4} (status: ${response.status})`);
    logger.verbose('Query:', query);
    logger.verbose('Variables:', variables);
    logger.debug('Response headers:', response.headers);
    logger.verbose('Response data:', response.data);

    return response.data.data;
  } catch (e) {
    logger.info(`POST ${githubApiBaseUrlV4} (status: ${e.response?.status})`);
    logger.info('Query:', query);
    logger.info('Variables:', variables);
    logger.debug('Response headers:', e.response?.headers);
    logger.info('Response data:', e.response?.data);

    if (handleError) {
      throw handleGithubV4Error(e);
    }
    throw e;
  }
}

export function handleGithubV4Error(e: AxiosError<GithubV4Response<null>>) {
  // not github api error
  if (!e.response?.data) {
    return e;
  }

  const errorMessages = e.response.data.errors?.map((error) => error.message);
  if (errorMessages) {
    return new HandledError(`${errorMessages.join(', ')} (Github v4)`);
  }

  return new HandledError(
    `Unexpected response from Github API (v4):\n${JSON.stringify(
      e.response.data,
      null,
      2
    )}`
  );
}
