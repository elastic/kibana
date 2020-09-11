import { URL } from 'url';
import gql from 'graphql-tag';
import nock from 'nock';

export function mockGqlRequest({
  name,
  statusCode,
  body,
  headers,
  apiBaseUrl,
}: {
  name: string;
  statusCode: number;
  body?: { data: Record<any, any> } | { errors: any[] };
  headers?: any;
  apiBaseUrl?: string;
}) {
  const { origin, pathname } = new URL(
    // default to localhost as host to avoid CORS issues
    apiBaseUrl ?? 'http://localhost/graphql'
  );

  const scope = nock(origin)
    .post(pathname, (body) => getGqlName(body.query) === name)
    .reply(statusCode, body, headers);

  return getNockCallsForScope(scope) as { query: string; variables: string }[];
}

function getGqlName(query: string) {
  const obj = gql`
    ${query}
  `;

  // @ts-expect-error
  return obj.definitions[0].name.value;
}

export function getNockCallsForScope(scope: nock.Scope) {
  const calls: unknown[] = [];
  scope.on('request', (req, interceptor, body) => {
    calls.push(JSON.parse(body));
  });
  return calls;
}
