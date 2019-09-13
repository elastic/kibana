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
  apiHostname,
  query,
  variables,
  accessToken
}: {
  apiHostname: string;
  query: string;
  variables?: {
    [key: string]: string | number | null;
  };
  accessToken: string;
}) {
  try {
    logger.verbose(query);
    logger.verbose(variables as any);
    const { data } = await axios.post<GithubResponse<DataResponse>>(
      `https://${apiHostname}/graphql`,
      { query, variables },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `bearer ${accessToken}`
        }
      }
    );

    logger.verbose(data);

    if (data.errors) {
      const message = data.errors.map(error => error.message).join(', ');
      throw new HandledError(message);
    }

    return data.data;
  } catch (ex) {
    const e = ex as AxiosError<{ errors: { message: string }[] | undefined }>;
    logger.info(e.message);

    if (
      e.response &&
      e.response.data &&
      Array.isArray(e.response.data.errors)
    ) {
      logger.info(e.config);
      logger.info(e.response.headers);
      logger.info(e.response.data);
      throw new HandledError(
        e.response.data.errors.map(error => error.message).join(', ')
      );
    }

    throw e;
  }
}
