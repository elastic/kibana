/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, AuthTypeDef } from '../../connector_spec';
import { GraphQLConnector } from './graphql';

describe('GraphQLConnector', () => {
  const ENDPOINT = 'https://api.example.com/graphql';

  const mockClient = {
    post: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: { url: ENDPOINT },
    log: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Metadata
  // ---------------------------------------------------------------------------
  describe('metadata', () => {
    it('has the correct id', () => {
      expect(GraphQLConnector.metadata.id).toBe('.graphql');
    });

    it('has the correct displayName', () => {
      expect(GraphQLConnector.metadata.displayName).toBe('GraphQL');
    });

    it('requires enterprise license', () => {
      expect(GraphQLConnector.metadata.minimumLicense).toBe('enterprise');
    });

    it('is marked as technical preview', () => {
      expect(GraphQLConnector.metadata.isTechnicalPreview).toBe(true);
    });

    it('supports agentBuilder', () => {
      expect(GraphQLConnector.metadata.supportedFeatureIds).toContain('agentBuilder');
    });
  });

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------
  describe('auth', () => {
    const authTypes = GraphQLConnector.auth?.types ?? [];

    const authTypeIds = authTypes.map((t) => (typeof t === 'string' ? t : t.type));

    it('lists auth types in the standard preference order', () => {
      expect(authTypeIds).toEqual([
        'none',
        'basic',
        'bearer',
        'oauth_authorization_code',
        'oauth_client_credentials',
      ]);
    });

    it('does not mark any auth type as recommended', () => {
      const recommended = authTypes.filter(
        (t): t is AuthTypeDef => typeof t === 'object' && Boolean(t.isRecommended)
      );
      expect(recommended).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // Schema
  // ---------------------------------------------------------------------------
  describe('schema', () => {
    it('is defined', () => {
      expect(GraphQLConnector.schema).toBeDefined();
    });

    it('requires a url field', () => {
      if (!GraphQLConnector.schema) throw new Error('schema not defined');
      expect(() => GraphQLConnector.schema?.parse({})).toThrow();
    });

    it('accepts a valid url', () => {
      if (!GraphQLConnector.schema) throw new Error('schema not defined');
      const parsed = GraphQLConnector.schema.parse({ url: ENDPOINT }) as { url: string };
      expect(parsed.url).toBe(ENDPOINT);
    });
  });

  // ---------------------------------------------------------------------------
  // validateUrls
  // ---------------------------------------------------------------------------
  describe('validateUrls', () => {
    it('validates the url field', () => {
      expect(GraphQLConnector.validateUrls?.fields).toContain('url');
    });
  });

  // ---------------------------------------------------------------------------
  // Helper: successful GraphQL response
  // ---------------------------------------------------------------------------
  const makeGraphQLResponse = (data: unknown) => ({
    data: { data },
  });

  const makeGraphQLErrorResponse = (messages: string[]) => ({
    data: {
      errors: messages.map((message) => ({ message })),
    },
  });

  // ---------------------------------------------------------------------------
  // query action
  // ---------------------------------------------------------------------------
  describe('query action', () => {
    it('is exposed as a tool', () => {
      expect(GraphQLConnector.actions.query.isTool).toBe(true);
    });

    it('has a description', () => {
      expect(typeof GraphQLConnector.actions.query.description).toBe('string');
      expect(GraphQLConnector.actions.query.description?.length).toBeGreaterThan(0);
    });

    it('posts to the configured url with the query document', async () => {
      mockClient.post.mockResolvedValue(makeGraphQLResponse({ users: [] }));

      await GraphQLConnector.actions.query.handler(mockContext, {
        query: '{ users { id name } }',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        ENDPOINT,
        { query: '{ users { id name } }' },
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
    });

    it('includes variables when provided', async () => {
      mockClient.post.mockResolvedValue(makeGraphQLResponse({ user: { id: '1' } }));

      await GraphQLConnector.actions.query.handler(mockContext, {
        query: 'query GetUser($id: ID!) { user(id: $id) { id } }',
        variables: { id: '1' },
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        ENDPOINT,
        { query: 'query GetUser($id: ID!) { user(id: $id) { id } }', variables: { id: '1' } },
        expect.anything()
      );
    });

    it('includes operationName when provided', async () => {
      mockClient.post.mockResolvedValue(makeGraphQLResponse({ users: [] }));

      await GraphQLConnector.actions.query.handler(mockContext, {
        query: 'query GetUsers { users { id } } query GetPosts { posts { id } }',
        operationName: 'GetUsers',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        ENDPOINT,
        expect.objectContaining({ operationName: 'GetUsers' }),
        expect.anything()
      );
    });

    it('returns the data field from the response', async () => {
      const data = { users: [{ id: '1', name: 'Alice' }] };
      mockClient.post.mockResolvedValue(makeGraphQLResponse(data));

      const result = await GraphQLConnector.actions.query.handler(mockContext, {
        query: '{ users { id name } }',
      });

      expect(result).toEqual(data);
    });

    it('throws when the response contains GraphQL errors', async () => {
      mockClient.post.mockResolvedValue(
        makeGraphQLErrorResponse(['Field not found', 'Unauthorized'])
      );

      await expect(
        GraphQLConnector.actions.query.handler(mockContext, {
          query: '{ badField }',
        })
      ).rejects.toThrow('GraphQL errors: Field not found; Unauthorized');
    });

    it('omits empty variables from the request body', async () => {
      mockClient.post.mockResolvedValue(makeGraphQLResponse({}));

      await GraphQLConnector.actions.query.handler(mockContext, {
        query: '{ __typename }',
        variables: {},
      });

      const body = mockClient.post.mock.calls[0][1] as Record<string, unknown>;
      expect(body.variables).toBeUndefined();
    });

    it('rejects mutation operation documents', async () => {
      await expect(
        GraphQLConnector.actions.query.handler(mockContext, {
          query: 'mutation CreateUser($name: String!) { createUser(name: $name) { id } }',
        })
      ).rejects.toThrow('Only query operations are allowed');
    });

    it('rejects multi-operation documents that contain a mutation', async () => {
      await expect(
        GraphQLConnector.actions.query.handler(mockContext, {
          query: 'query Q { __typename } mutation M { createUser(name: "x") { id } }',
          operationName: 'M',
        })
      ).rejects.toThrow('Only query operations are allowed');
    });

    it('rejects syntactically invalid GraphQL documents', async () => {
      await expect(
        GraphQLConnector.actions.query.handler(mockContext, {
          query: '{ not valid !!!',
        })
      ).rejects.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // mutation action
  // ---------------------------------------------------------------------------
  describe('mutation action', () => {
    it('is not exposed as an agent tool', () => {
      expect(GraphQLConnector.actions.mutation.isTool).toBe(false);
    });

    it('has a description', () => {
      expect(typeof GraphQLConnector.actions.mutation.description).toBe('string');
      expect(GraphQLConnector.actions.mutation.description?.length).toBeGreaterThan(0);
    });

    it('posts the mutation document to the configured url', async () => {
      mockClient.post.mockResolvedValue(makeGraphQLResponse({ createUser: { id: '2' } }));

      await GraphQLConnector.actions.mutation.handler(mockContext, {
        mutation: 'mutation CreateUser($name: String!) { createUser(name: $name) { id } }',
        variables: { name: 'Bob' },
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        ENDPOINT,
        expect.objectContaining({
          query: 'mutation CreateUser($name: String!) { createUser(name: $name) { id } }',
          variables: { name: 'Bob' },
        }),
        expect.anything()
      );
    });

    it('returns the data field from the mutation response', async () => {
      const data = { createUser: { id: '2', name: 'Bob' } };
      mockClient.post.mockResolvedValue(makeGraphQLResponse(data));

      const result = await GraphQLConnector.actions.mutation.handler(mockContext, {
        mutation: 'mutation CreateUser($name: String!) { createUser(name: $name) { id name } }',
        variables: { name: 'Bob' },
      });

      expect(result).toEqual(data);
    });

    it('throws when the mutation returns GraphQL errors', async () => {
      mockClient.post.mockResolvedValue(makeGraphQLErrorResponse(['Validation error']));

      await expect(
        GraphQLConnector.actions.mutation.handler(mockContext, {
          mutation: 'mutation { deleteAll }',
        })
      ).rejects.toThrow('GraphQL errors: Validation error');
    });
  });

  // ---------------------------------------------------------------------------
  // introspect action
  // ---------------------------------------------------------------------------
  describe('introspect action', () => {
    it('is exposed as a tool', () => {
      expect(GraphQLConnector.actions.introspect.isTool).toBe(true);
    });

    it('has a description', () => {
      expect(typeof GraphQLConnector.actions.introspect.description).toBe('string');
      expect(GraphQLConnector.actions.introspect.description?.length).toBeGreaterThan(0);
    });

    const makeIntrospectionResponse = (types: Array<{ name: string; kind: string }>) => ({
      data: {
        data: {
          __schema: {
            queryType: { name: 'Query' },
            mutationType: { name: 'Mutation' },
            types,
          },
        },
      },
    });

    it('returns queryType, mutationType, and filtered types', async () => {
      const userDefinedTypes = [
        {
          name: 'User',
          kind: 'OBJECT',
          description: 'A user',
          fields: [],
          inputFields: [],
          enumValues: [],
        },
        {
          name: '__Schema',
          kind: 'OBJECT',
          description: 'Introspection type',
          fields: [],
          inputFields: [],
          enumValues: [],
        },
        {
          name: 'String',
          kind: 'SCALAR',
          description: 'Built-in string',
          fields: null,
          inputFields: null,
          enumValues: null,
        },
      ];
      mockClient.post.mockResolvedValue(makeIntrospectionResponse(userDefinedTypes));

      const result = (await GraphQLConnector.actions.introspect.handler(mockContext, {
        includeBuiltins: false,
      })) as { queryType: string; mutationType: string; types: Array<{ name: string }> };

      expect(result.queryType).toBe('Query');
      expect(result.mutationType).toBe('Mutation');
      // User should be included; __Schema and String should be filtered
      expect(result.types.map((t) => t.name)).toContain('User');
      expect(result.types.map((t) => t.name)).not.toContain('__Schema');
      expect(result.types.map((t) => t.name)).not.toContain('String');
    });

    it('includes built-in types when includeBuiltins is true', async () => {
      const allTypes = [
        {
          name: 'User',
          kind: 'OBJECT',
          description: null,
          fields: [],
          inputFields: [],
          enumValues: [],
        },
        {
          name: 'String',
          kind: 'SCALAR',
          description: null,
          fields: null,
          inputFields: null,
          enumValues: null,
        },
        {
          name: '__Schema',
          kind: 'OBJECT',
          description: null,
          fields: [],
          inputFields: [],
          enumValues: [],
        },
      ];
      mockClient.post.mockResolvedValue(makeIntrospectionResponse(allTypes));

      const result = (await GraphQLConnector.actions.introspect.handler(mockContext, {
        includeBuiltins: true,
      })) as { types: Array<{ name: string }> };

      const names = result.types.map((t) => t.name);
      expect(names).toContain('String');
      expect(names).toContain('__Schema');
    });

    it('throws when the server returns GraphQL errors', async () => {
      mockClient.post.mockResolvedValue(makeGraphQLErrorResponse(['Introspection disabled']));

      await expect(
        GraphQLConnector.actions.introspect.handler(mockContext, { includeBuiltins: false })
      ).rejects.toThrow('GraphQL errors: Introspection disabled');
    });
  });

  // ---------------------------------------------------------------------------
  // test handler
  // ---------------------------------------------------------------------------
  describe('test handler', () => {
    it('is defined', () => {
      expect(GraphQLConnector.test).toBeDefined();
      expect(typeof GraphQLConnector.test?.handler).toBe('function');
    });

    it('returns ok when the endpoint responds successfully', async () => {
      mockClient.post.mockResolvedValue({ data: { data: { __typename: 'Query' } } });

      const result = await GraphQLConnector.test.handler(mockContext);

      expect(result.message).toContain('Query');
    });

    it('throws when the request fails', async () => {
      mockClient.post.mockRejectedValue(new Error('network error'));

      if (!GraphQLConnector.test) throw new Error('test not defined');
      await expect(GraphQLConnector.test.handler(mockContext)).rejects.toThrow('network error');
    });

    it('throws with auth message on 401', async () => {
      const err = Object.assign(new Error('Unauthorized'), { response: { status: 401 } });
      mockClient.post.mockRejectedValue(err);

      if (!GraphQLConnector.test) throw new Error('test not defined');
      await expect(GraphQLConnector.test.handler(mockContext)).rejects.toThrow(
        'Authentication failed'
      );
    });

    it('throws with access message on 403', async () => {
      const err = Object.assign(new Error('Forbidden'), { response: { status: 403 } });
      mockClient.post.mockRejectedValue(err);

      if (!GraphQLConnector.test) throw new Error('test not defined');
      await expect(GraphQLConnector.test.handler(mockContext)).rejects.toThrow('Access denied');
    });

    it('sends the minimal introspection probe to the configured url', async () => {
      mockClient.post.mockResolvedValue({ data: { data: { __typename: 'Query' } } });

      if (!GraphQLConnector.test) throw new Error('test not defined');
      await GraphQLConnector.test.handler(mockContext);

      expect(mockClient.post).toHaveBeenCalledWith(
        ENDPOINT,
        { query: '{ __typename }' },
        expect.anything()
      );
    });
  });

  // ---------------------------------------------------------------------------
  // skill property
  // ---------------------------------------------------------------------------
  describe('skill property', () => {
    it('is defined as a string', () => {
      expect(typeof GraphQLConnector.skill).toBe('string');
    });

    it('contains guidance on using introspect before writing queries', () => {
      expect(GraphQLConnector.skill).toContain('introspect');
    });

    it('mentions variables as the preferred parameterisation mechanism', () => {
      expect(GraphQLConnector.skill).toContain('variables');
    });

    it('includes mutation guidance', () => {
      expect(GraphQLConnector.skill).toContain('mutation');
    });
  });
});
