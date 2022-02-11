import { URL } from 'url';
import gql from 'graphql-tag';
import { disableFragmentWarnings } from 'graphql-tag';
import nock from 'nock';

disableFragmentWarnings();

export function mockGqlRequest<T>({
  name,
  statusCode,
  body,
  headers,
  apiBaseUrl,
}: {
  name: string;
  statusCode: number;
  body?: { data: T } | { errors: any[] };
  headers?: any;
  apiBaseUrl?: string;
}) {
  const { origin, pathname } = new URL(
    // default to localhost as host to avoid CORS issues
    apiBaseUrl ?? 'http://localhost/graphql'
  );

  const scope = nock(origin)
    .post(pathname, (body) => {
      return getQueryNameFromString(body.query) === name;
    })
    .reply(statusCode, body, headers);

  return listenForCallsToNockScope(scope) as {
    query: string;
    variables: string;
  }[];
}

function getQueryNameFromString(query: string) {
  const obj = gql(query);

  // @ts-expect-error
  return obj.definitions[0].name.value;
}

export function listenForCallsToNockScope(scope: nock.Scope) {
  const calls: unknown[] = [];
  scope.on('request', (req, interceptor, body) => {
    calls.push(JSON.parse(body));
  });
  return calls;
}
