import axios, { AxiosError } from 'axios';
import { HandledError } from '../HandledError';
import { logger } from '../logger';

interface GithubResponse<DataResponse> {
  data: DataResponse;
  errors: {
    type: string;
    path: string[];
    locations: {
      line: number;
      column: number;
    }[];
    message: string;
  }[];
}

export async function gqlRequest<DataResponse>({
  githubApiBaseUrlV4,
  query,
  variables,
  accessToken,
}: {
  githubApiBaseUrlV4: string;
  query: string;
  variables?: {
    [key: string]: string | number | null;
  };
  accessToken: string;
}) {
  try {
    logger.verbose('gql query:', query);
    logger.verbose('gql variables:', variables);
    const response = await axios.post<GithubResponse<DataResponse>>(
      githubApiBaseUrlV4,
      { query, variables },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `bearer ${accessToken}`,
        },
      }
    );

    logger.debug('gql response:', response.data);

    if (response.data.errors) {
      const newError = new Error();
      //@ts-ignore
      newError.response = response;
      throw newError;
    }

    return response.data.data;
  } catch (ex) {
    const e = ex as AxiosError<{ errors: { message: string }[] | undefined }>;
    logger.info(e.message);

    if (e.response?.data) {
      logger.info('API v4 config:', e.config);
      logger.info('API v4 response headers:', e.response.headers);
      logger.info('API v4 response data', e.response.data);

      const errorMessages = e.response.data.errors?.map(
        (error) => error.message
      );

      if (errorMessages) {
        throw new HandledError(errorMessages.join(', '));
      }

      throw new HandledError(
        `Unexpected response from Github:\n${JSON.stringify(
          e.response.data,
          null,
          2
        )}`
      );
    }

    throw e;
  }
}
