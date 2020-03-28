import axios, { AxiosError } from 'axios';
import { HandledError } from '../HandledError';
import { logger } from '../logger';
import dedent from 'dedent';

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
    logger.verbose(query);
    logger.verbose(variables as any);
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

    logger.verbose(response.data);

    if (response.data.errors) {
      const newError = new Error();
      ((newError as unknown) as any).response = response;

      throw newError;
    }

    return response.data.data;
  } catch (ex) {
    const e = ex as AxiosError<{ errors: { message: string }[] | undefined }>;
    logger.info(e.message);

    if (e.response?.data) {
      logger.info(e.config);
      logger.info(e.response.headers);
      logger.info(e.response.data);

      const errorMessages = e.response.data.errors
        ?.map((error) => error.message)
        .join(', ');

      const stringifiedResponseData = JSON.stringify(e.response.data, null, 2);

      throw new HandledError(
        dedent(`Unexpected response from Github:

        ${errorMessages ? errorMessages : stringifiedResponseData}`)
      );
    }

    throw e;
  }
}
