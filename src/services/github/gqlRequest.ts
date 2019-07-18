import axios from 'axios';
import get from 'lodash.get';
import { HandledError } from '../HandledError';

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

    if (data.errors) {
      throw new HandledError(
        data.errors.map(error => error.message).join(', ')
      );
    }

    return data.data;
  } catch (e) {
    const responseError = get(e, 'response.data.errors') as {
      message: string;
    }[];
    if (responseError) {
      throw new HandledError(
        responseError.map(error => error.message).join(', ')
      );
    }

    throw e;
  }
}
