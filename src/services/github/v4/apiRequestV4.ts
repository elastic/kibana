import axios, { AxiosResponse } from 'axios';
import gql from 'graphql-tag';
import { HandledError } from '../../HandledError';
import { logger } from '../../logger';

interface GithubError {
  type: string;
  path: string[];
  locations: {
    line: number;
    column: number;
  }[];
  message: string;
}

export interface GithubV4Response<DataResponse> {
  data: DataResponse;
  errors?: GithubError[];
}

type Variables = Record<string, string | number | null>;

export async function apiRequestV4<DataResponse>({
  githubApiBaseUrlV4 = 'https://api.github.com/graphql',
  accessToken,
  query,
  variables,
}: {
  githubApiBaseUrlV4?: string;
  accessToken: string;
  query: string;
  variables?: Variables;
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
      const message = `${response.data.errors
        .map((error) => error.message)
        .join(',')} (Github API v4)`;

      throw new GithubV4Exception(message, response);
    }

    addDebugLogs({
      githubApiBaseUrlV4,
      query,
      variables,
      axiosResponse: response,
      didSucceed: false,
    });

    return response.data.data;
  } catch (e) {
    if (axios.isAxiosError(e) && e.response) {
      addDebugLogs({
        githubApiBaseUrlV4,
        query,
        variables,
        axiosResponse: e.response,
        didSucceed: false,
      });
      throw new GithubV4Exception(
        `${e.message} (Unhandled Github API v4)`,
        e.response
      );
    }

    throw e;
  }
}

function addDebugLogs({
  githubApiBaseUrlV4,
  query,
  variables,
  axiosResponse,
  didSucceed,
}: {
  githubApiBaseUrlV4: string;
  query: string;
  variables?: Variables;
  axiosResponse: AxiosResponse;
  didSucceed: boolean;
}) {
  const gqlQueryName = getGqlQueryName(query);
  logger.info(
    `POST ${githubApiBaseUrlV4} (name:${gqlQueryName}, status: ${axiosResponse.status})`
  );
  const logMethod = didSucceed ? logger.verbose : logger.info;

  logMethod(`Query name ${gqlQueryName}`);
  logMethod(`Query: ${query}`);
  logMethod('Variables:', variables);
  logMethod('Response headers:', axiosResponse.headers);
  logMethod('Response data:', axiosResponse.data);
}

type AxiosGithubResponse<DataResponse> = AxiosResponse<
  GithubV4Response<DataResponse | null>,
  any
>;
export class GithubV4Exception<DataResponse> extends Error {
  constructor(
    public message: string,
    public axiosResponse: AxiosGithubResponse<DataResponse>
  ) {
    super(message);
    Error.captureStackTrace(this, HandledError);
    this.name = 'GithubV4Exception';
  }
}

function getGqlQueryName(query: string) {
  const ast = gql(query);
  //@ts-expect-error
  return ast.definitions[0].name.value;
}
