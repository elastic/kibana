/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * GraphQL Connector
 *
 * A generic connector for executing GraphQL queries and mutations against any
 * GraphQL endpoint. Supports:
 * - Parameterised queries and mutations (via GraphQL variables)
 * - Schema introspection (discover available types and operations)
 * - Multiple auth modes: none, Basic, Bearer, OAuth authorization code, or OAuth client credentials
 */

import { parse, OperationTypeNode } from 'graphql';
import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import { UISchemas, type ActionContext, type ConnectorSpec } from '../../connector_spec';
import type { QueryInput, MutationInput, IntrospectInput } from './types';
import { QueryInputSchema, MutationInputSchema, IntrospectInputSchema } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Built-in GraphQL scalar type names and the meta-field prefix used by
 * introspection.  Filtered out when `includeBuiltins` is false.
 */
const BUILTIN_TYPE_NAMES = new Set(['String', 'Int', 'Float', 'Boolean', 'ID']);

/**
 * Execute a raw GraphQL document (query or mutation) against the configured
 * endpoint and return the `data` field from the response.
 *
 * Throws a descriptive error when the server returns a `errors` array, so
 * handlers do not have to check for partial failures manually.
 */
async function executeGraphQL(
  ctx: ActionContext,
  document: string,
  variables?: Record<string, unknown>,
  operationName?: string
): Promise<unknown> {
  const { url } = ctx.config as { url: string };

  const body: Record<string, unknown> = { query: document };
  if (variables && Object.keys(variables).length > 0) {
    body.variables = variables;
  }
  if (operationName) {
    body.operationName = operationName;
  }

  const response = await ctx.client.post(url, body, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  const responseData = response.data as {
    data?: unknown;
    errors?: Array<{ message: string; locations?: unknown; path?: unknown; extensions?: unknown }>;
  };

  if (responseData.errors && responseData.errors.length > 0) {
    const messages = responseData.errors.map((e) => e.message).join('; ');
    throw new Error(`GraphQL errors: ${messages}`);
  }

  return responseData.data;
}

// ---------------------------------------------------------------------------
// Introspection query
// ---------------------------------------------------------------------------

/**
 * A focused GraphQL introspection query that returns the schema's query type,
 * mutation type, and the fields/args of all non-deprecated user-defined types.
 * Keeps the response agent-friendly by omitting subscription types, deprecated
 * items, and very deeply nested ofType chains.
 */
const INTROSPECTION_QUERY = `
  query IntrospectSchema {
    __schema {
      queryType { name }
      mutationType { name }
      types {
        name
        kind
        description
        fields(includeDeprecated: false) {
          name
          description
          type {
            name
            kind
            ofType {
              name
              kind
              ofType {
                name
                kind
                ofType {
                  name
                  kind
                }
              }
            }
          }
          args {
            name
            description
            type {
              name
              kind
              ofType {
                name
                kind
                ofType {
                  name
                  kind
                  ofType {
                    name
                    kind
                  }
                }
              }
            }
            defaultValue
          }
        }
        inputFields {
          name
          description
          type {
            name
            kind
            ofType {
              name
              kind
              ofType {
                name
                kind
                ofType {
                  name
                  kind
                }
              }
            }
          }
          defaultValue
        }
        enumValues(includeDeprecated: false) {
          name
          description
        }
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Connector spec
// ---------------------------------------------------------------------------

export const GraphQLConnector: ConnectorSpec = {
  metadata: {
    id: '.graphql',
    displayName: 'GraphQL',
    description: i18n.translate('connectorSpecs.graphQL.metadata.description', {
      defaultMessage: 'Run queries and mutations, and introspect schemas on any GraphQL endpoint',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'none',
        defaults: {},
        overrides: {
          label: i18n.translate('connectorSpecs.graphQL.auth.none.label', {
            defaultMessage: 'No authentication',
          }),
        },
      },
      {
        type: 'basic',
        defaults: {},
        overrides: {
          label: i18n.translate('connectorSpecs.graphQL.auth.basic.label', {
            defaultMessage: 'Basic authentication',
          }),
        },
      },
      {
        type: 'bearer',
        defaults: {},
        overrides: {
          label: i18n.translate('connectorSpecs.graphQL.auth.bearer.label', {
            defaultMessage: 'Bearer token',
          }),
          meta: {
            token: {
              helpText: i18n.translate('connectorSpecs.graphQL.auth.bearer.token.helpText', {
                defaultMessage:
                  'OAuth access token, JWT, or API access token sent in the Authorization header as a Bearer token.',
              }),
            },
          },
        },
      },
      {
        type: 'oauth_authorization_code',
        defaults: {},
        overrides: {
          label: i18n.translate('connectorSpecs.graphQL.auth.oauthAuthorizationCode.label', {
            defaultMessage: 'OAuth 2.0 authorization code',
          }),
          meta: {
            authorizationUrl: {
              placeholder: 'https://example.com/oauth/authorize',
              helpText: i18n.translate(
                'connectorSpecs.graphQL.auth.oauthAuthorizationCode.authorizationUrl.helpText',
                {
                  defaultMessage:
                    'Authorization endpoint for the OAuth authorization-code flow. After you authorize, the connector stores tokens and sends the access token as a Bearer token.',
                }
              ),
            },
            tokenUrl: {
              placeholder: 'https://example.com/oauth/token',
              helpText: i18n.translate(
                'connectorSpecs.graphQL.auth.oauthAuthorizationCode.tokenUrl.helpText',
                {
                  defaultMessage:
                    'Token endpoint used to exchange the authorization code (and refresh tokens) for an access token.',
                }
              ),
            },
            scope: {
              helpText: i18n.translate(
                'connectorSpecs.graphQL.auth.oauthAuthorizationCode.scope.helpText',
                {
                  defaultMessage:
                    'Optional OAuth scopes required by your provider. Leave blank if the provider does not require scopes.',
                }
              ),
            },
          },
        },
      },
      {
        type: 'oauth_client_credentials',
        defaults: {},
        overrides: {
          label: i18n.translate('connectorSpecs.graphQL.auth.oauthClientCredentials.label', {
            defaultMessage: 'OAuth 2.0 client credentials',
          }),
          meta: {
            tokenUrl: {
              placeholder: 'https://auth.example.com/oauth/token',
              helpText: i18n.translate(
                'connectorSpecs.graphQL.auth.oauthClientCredentials.tokenUrl.helpText',
                {
                  defaultMessage:
                    'Token endpoint for the OAuth client-credentials flow. The connector exchanges the client ID and secret for an access token and sends it as a Bearer token.',
                }
              ),
            },
            scope: {
              helpText: i18n.translate(
                'connectorSpecs.graphQL.auth.oauthClientCredentials.scope.helpText',
                {
                  defaultMessage:
                    'Optional OAuth scopes required by your token endpoint. Leave blank if the provider does not require scopes.',
                }
              ),
            },
          },
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      url: UISchemas.url()
        .describe('The GraphQL endpoint URL — the single URL that accepts all GraphQL operations')
        .meta({
          widget: 'text',
          label: i18n.translate('connectorSpecs.graphQL.config.url.label', {
            defaultMessage: 'GraphQL endpoint URL',
          }),
          placeholder: 'https://api.example.com/graphql',
          helpText: i18n.translate('connectorSpecs.graphQL.config.url.helpText', {
            defaultMessage:
              'The URL of your GraphQL API. All queries and mutations are sent as POST requests to this URL.',
          }),
          validate: { allowedHosts: true },
        }),
    })
  ),

  validateUrls: {
    fields: ['url'],
  },

  actions: {
    // ── Schema discovery ──────────────────────────────────────────────────────
    introspect: {
      isTool: true,
      description:
        'Introspect the GraphQL schema to discover available types, queries, and mutations. ' +
        'Returns a structured summary of the schema including all user-defined types, their ' +
        'fields, and input arguments. Call this before writing queries when you are unfamiliar ' +
        'with the API or need to discover what operations are supported. ' +
        'Built-in scalar types (String, Int, Float, Boolean, ID) and introspection meta-types ' +
        '(prefixed with `__`) are excluded by default to keep the response concise.',
      input: IntrospectInputSchema,
      handler: async (ctx, input: IntrospectInput) => {
        const raw = (await executeGraphQL(ctx, INTROSPECTION_QUERY)) as {
          __schema?: {
            queryType?: { name: string };
            mutationType?: { name: string };
            types?: Array<{
              name: string;
              kind: string;
              description?: string;
              fields?: unknown[];
              inputFields?: unknown[];
              enumValues?: unknown[];
            }>;
          };
        };

        const schema = raw?.__schema;
        if (!schema) {
          throw new Error('Introspection returned no __schema field');
        }

        const types = (schema.types ?? []).filter((t) => {
          if (!input.includeBuiltins) {
            if (t.name.startsWith('__')) return false;
            if (BUILTIN_TYPE_NAMES.has(t.name)) return false;
          }
          return true;
        });

        return {
          queryType: schema.queryType?.name ?? null,
          mutationType: schema.mutationType?.name ?? null,
          types,
        };
      },
    },

    // ── Read operations ───────────────────────────────────────────────────────
    query: {
      isTool: true,
      description:
        'Execute a read-only GraphQL query against the configured endpoint. ' +
        'Returns the `data` field from the GraphQL response. ' +
        'Pass variables to parameterise the query instead of hard-coding values. ' +
        'Use `introspect` first to discover the available fields and argument types. ' +
        'Throws if the server returns any GraphQL errors.',
      input: QueryInputSchema,
      handler: async (ctx, input: QueryInput) => {
        const doc = parse(input.query);
        if (
          doc.definitions.some(
            (d) => d.kind === 'OperationDefinition' && d.operation !== OperationTypeNode.QUERY
          )
        ) {
          throw new Error(
            'Only query operations are allowed in this action. Use the mutation action for mutations.'
          );
        }
        return executeGraphQL(ctx, input.query, input.variables, input.operationName);
      },
    },

    // ── Write operations ──────────────────────────────────────────────────────
    mutation: {
      isTool: false,
      description:
        'Execute a GraphQL mutation against the configured endpoint. ' +
        'Use this to create, update, or delete data. ' +
        'Mutations modify server state — confirm the intended effect before calling. ' +
        'Returns the `data` field from the GraphQL response. ' +
        'Pass variables to parameterise the mutation instead of hard-coding values. ' +
        'Use `introspect` first to discover the mutation type and its required arguments. ' +
        'Throws if the server returns any GraphQL errors.',
      input: MutationInputSchema,
      handler: async (ctx, input: MutationInput) => {
        return executeGraphQL(ctx, input.mutation, input.variables, input.operationName);
      },
    },
  },

  test: {
    enabled: true,
    description: i18n.translate('connectorSpecs.graphQL.test.description', {
      defaultMessage: 'Verifies the GraphQL endpoint by running a minimal introspection query.',
    }),
    handler: async (ctx) => {
      try {
        // A minimal introspection query that every spec-compliant GraphQL server
        // must answer. If the endpoint is reachable and valid, this succeeds.
        const result = (await executeGraphQL(ctx, '{ __typename }')) as {
          __typename?: string;
        } | null;

        const typeName = result?.__typename ?? 'unknown';
        return {
          message: i18n.translate('connectorSpecs.graphQL.test.successMessage', {
            defaultMessage:
              'Successfully connected to the GraphQL endpoint (queryType: {typeName})',
            values: { typeName },
          }),
        };
      } catch (error) {
        const err = error as { message?: string; response?: { status?: number } };
        const status = err.response?.status;
        const reason =
          status === 401
            ? i18n.translate('connectorSpecs.graphQL.test.unauthorizedMessage', {
                defaultMessage: 'Authentication failed — check your credentials',
              })
            : status === 403
            ? i18n.translate('connectorSpecs.graphQL.test.forbiddenMessage', {
                defaultMessage:
                  'Access denied — the credentials lack permission to query this endpoint',
              })
            : err.message ?? 'Unknown error';

        throw new Error(
          i18n.translate('connectorSpecs.graphQL.test.failureMessage', {
            defaultMessage: 'Failed to connect to the GraphQL endpoint: {reason}',
            values: { reason },
          })
        );
      }
    },
  },

  skill: [
    '## GraphQL Connector — usage guidance',
    '',
    '### Before writing operations',
    'Call `introspect` first to discover the schema — it returns all user-defined types with ' +
      'their fields and input arguments. Identify the root query type and mutation type names, ' +
      'then look up fields on those types.',
    '',
    '### Executing queries',
    'Use `query` for read-only operations. Always pass runtime values via `variables` rather than ' +
      'interpolating them into the query string — this prevents injection and lets the server cache ' +
      'the parsed operation. Example:',
    '```graphql',
    'query GetUser($id: ID!) { user(id: $id) { id name email } }',
    '```',
    'with `variables: { "id": "123" }`.',
    '',
    '### Executing mutations',
    'Use `mutation` to create, update, or delete data. Confirm the intended change before calling, ' +
      'as mutations modify server state. Pass input as `variables` using the exact input type ' +
      'shown by `introspect`.',
    '',
    '### Handling errors',
    'Both `query` and `mutation` throw when the server returns a GraphQL `errors` array. ' +
      'The error message includes all error messages joined with `;`. ' +
      'If a query partially succeeds (data + errors), the error is still thrown — ' +
      'check the raw response if you need partial results.',
    '',
    '### Common gotchas',
    '- GraphQL endpoints always use POST, even for read operations.',
    '- Credentials must allow the fields you query; auth failures usually surface as HTTP 401/403.',
    '- Some APIs require the `operationName` field when the document contains multiple operations.',
    '- Introspection may be disabled on production endpoints for security; ' +
      'consult the API documentation if `introspect` fails.',
    '- The `mutation` action is not exposed as an agent tool.',
  ].join('\n'),
};
