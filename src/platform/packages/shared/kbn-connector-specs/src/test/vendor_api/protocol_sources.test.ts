/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildSchema, introspectionFromSchema } from 'graphql';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { z } from '@kbn/zod/v4';
import type { McpTool } from '@kbn/connector-emulate';
import type { ConnectorSpec } from '../../connector_spec';
import { callToolJson } from '../../lib/mcp/call_tool_helpers';
import { detectDrift } from './detect_drift';
import { parseManifest } from './manifest';
import {
  diffProtocolSnapshots,
  loadProtocolSpec,
  parseProtocolSnapshot,
  projectProtocolSpec,
} from './protocol_sources';
import { updateVendorApi } from './update_vendor_api';

const GRAPHQL_ENDPOINT = 'https://api.example.com/graphql';
const MCP_ENDPOINT = 'https://mcp.example.com/mcp';
const GRAPHQL_SPEC_URL = 'https://specs.example.com/schema.graphql';
const MCP_SPEC_URL = 'https://specs.example.com/tools.json';

const sdl = `
directive @internal on FIELD_DEFINITION

"The queries."
type Query {
  "A board."
  board(id: ID!, filter: BoardFilter): Board @internal
  unused: Unused
}

type Mutation {
  createBoard(name: String!): Board
}

type Subscription {
  boardChanged: Board
}

input BoardFilter {
  state: State
}

enum State {
  OPEN
  CLOSED
}

interface Node {
  id: ID!
}

type Board implements Node {
  id: ID!
  owner: Owner
  state: State
}

union Owner = Person | Team

type Person {
  name: String
}

type Team {
  size: Int
}

type Card implements Node {
  id: ID!
}

type Unused {
  id: ID!
}
`;

const tools = [
  {
    name: 'search',
    description: 'Searches',
    inputSchema: {
      type: 'object',
      description: 'The arguments',
      required: ['query'],
      properties: {
        query: { type: 'string', description: 'What to find' },
        description: { type: 'string', title: 'A property named description stays' },
        mode: { type: 'string', enum: ['fast', 'full'], default: 'fast' },
      },
    },
    outputSchema: {
      type: 'object',
      required: ['total'],
      properties: {
        total: { type: 'integer' },
        kind: { type: 'string', enum: ['file'] },
      },
    },
    annotations: { readOnlyHint: true, title: 'Search' },
  },
  { name: 'unused', inputSchema: { type: 'object' } },
];

interface SearchToolDraft {
  inputSchema: {
    required: string[];
    properties: Record<string, Record<string, unknown>>;
  };
  outputSchema: {
    required: string[];
    properties: Record<string, Record<string, unknown>>;
  };
  annotations: { readOnlyHint: boolean };
}

const graphQLSpec = { format: 'graphql', sdl, endpoints: [GRAPHQL_ENDPOINT] } as const;
const mcpSpec = { format: 'mcp', tools, endpoints: [MCP_ENDPOINT] } as const;

const project = (schema: string, names: string[]) =>
  projectProtocolSpec({ format: 'graphql', sdl: schema, endpoints: [GRAPHQL_ENDPOINT] }, names);

const diffOf = (format: 'graphql' | 'mcp', base: string, current: string) =>
  diffProtocolSnapshots(format, base, current).map(({ kind, id }) => [kind, id]);

describe('protocol sources', () => {
  describe('loadProtocolSpec', () => {
    it('reads GraphQL from SDL or an introspection result', async () => {
      const introspection = JSON.stringify({
        data: introspectionFromSchema(buildSchema('type Query { hello: String }')),
      });
      const load = (text: string) =>
        loadProtocolSpec(GRAPHQL_SPEC_URL, async () => text, 'graphql', [GRAPHQL_ENDPOINT]);

      expect(await load('type Query { hello: String }')).toEqual({
        format: 'graphql',
        sdl: 'type Query {\n  hello: String\n}',
        endpoints: [GRAPHQL_ENDPOINT],
      });
      expect((await load(introspection)).format).toBe('graphql');
      await expect(load('{ "error": "unauthorized" }')).rejects.toThrow(/not an introspection/);
    });

    it('reads MCP from a tools/list result, wrapped in JSON-RPC or not', async () => {
      const load = (value: unknown) =>
        loadProtocolSpec(MCP_SPEC_URL, async () => JSON.stringify(value), 'mcp', [MCP_ENDPOINT]);

      expect(await load({ tools })).toEqual(mcpSpec);
      expect(await load({ jsonrpc: '2.0', id: 1, result: { tools } })).toEqual(mcpSpec);
      await expect(load({ tools: [{ name: 'no schema' }] })).rejects.toThrow(/tools\/list/);
    });
  });

  describe('projectProtocolSpec', () => {
    it('keeps the GraphQL root fields used and what they reach, without documentation', () => {
      const projected = projectProtocolSpec(graphQLSpec, ['query board']);

      expect(projected).toContain('board(filter: BoardFilter, id: ID!): Board');
      expect(projected).toContain('union Owner = Person | Team');
      expect(projected).toContain('type Person');
      expect(projected).toContain('input BoardFilter');
      expect(projected).toContain('enum State');
      for (const left of [
        'unused',
        'Unused',
        'Mutation',
        'Subscription',
        'The queries',
        '@internal',
      ]) {
        expect(projected).not.toContain(left);
      }
    });

    it('keeps the types that implement an interface a field returns', () => {
      const projected = project(
        'type Query { node: Node, other: Other } interface Node { id: ID! } type Card implements Node { id: ID! } type Other { id: ID! }',
        ['query node']
      );

      expect(projected).toContain('type Card implements Node');
      expect(projected).not.toContain('Other');
    });

    it('keeps a query field when only mutations are used, so the schema stays valid', () => {
      const projected = projectProtocolSpec(graphQLSpec, ['mutation createBoard']);

      expect(() => buildSchema(projected)).not.toThrow();
      expect(projected).toContain('createBoard(name: String!): Board');
      expect(projected).toContain('board(filter: BoardFilter, id: ID!): Board');
    });

    it('is stable when projected again', () => {
      const projected = projectProtocolSpec(graphQLSpec, ['query board']);

      expect(project(projected, ['query board'])).toBe(projected);
    });

    it('keeps the MCP tools used, with documentation stripped but properties intact', () => {
      const { tools: projected } = JSON.parse(projectProtocolSpec(mcpSpec, ['tools/call search']));

      expect(projected).toEqual([
        {
          name: 'search',
          inputSchema: {
            type: 'object',
            required: ['query'],
            properties: {
              query: { type: 'string' },
              description: { type: 'string' },
              mode: { type: 'string', enum: ['fast', 'full'], default: 'fast' },
            },
          },
          outputSchema: {
            type: 'object',
            required: ['total'],
            properties: {
              total: { type: 'integer' },
              kind: { type: 'string', enum: ['file'] },
            },
          },
          annotations: { readOnlyHint: true },
        },
      ]);
    });

    it('reads its own MCP snapshots back', () => {
      const snapshot = projectProtocolSpec(mcpSpec, ['tools/call search']);

      expect(
        projectProtocolSpec(parseProtocolSnapshot('mcp', snapshot, [MCP_ENDPOINT]), ['search'])
      ).toBe(snapshot);
    });
  });

  describe('diffProtocolSnapshots', () => {
    const schema = (board: string, state = 'OPEN') =>
      project(`type Query { board: Board } type Board { ${board} } enum State { ${state} }`, [
        'query board',
      ]);
    const base = schema('id: ID! state: State');

    it.each([
      ['a removed field', schema('state: State'), 'breaking', 'FIELD_REMOVED'],
      [
        'a new enum value',
        schema('id: ID! state: State', 'OPEN CLOSED'),
        'breaking',
        'VALUE_ADDED_TO_ENUM',
      ],
      ['a new field', schema('id: ID! state: State name: String'), 'non-breaking', 'FIELD_ADDED'],
      [
        'a deprecated field',
        schema('id: ID! @deprecated(reason: "gone") state: State'),
        'deprecation',
        'FIELD_DEPRECATED',
      ],
    ])('classifies %s in GraphQL', (_, current, kind, id) => {
      expect(diffOf('graphql', base, current)).toContainEqual([kind, id]);
    });

    it('treats optional arguments as non-breaking and required ones as breaking in GraphQL', () => {
      const withArgument = (argument: string) =>
        project(`type Query { board(${argument}): String }`, ['query board']);
      const noArgument = project('type Query { board: String }', ['query board']);

      expect(diffOf('graphql', noArgument, withArgument('a: Int'))).toContainEqual([
        'non-breaking',
        'OPTIONAL_ARG_ADDED',
      ]);
      expect(diffOf('graphql', noArgument, withArgument('a: Int!'))).toContainEqual([
        'breaking',
        'REQUIRED_ARG_ADDED',
      ]);
    });

    const snapshot = (change: (tool: SearchToolDraft) => void = () => {}) => {
      const tool: SearchToolDraft = JSON.parse(JSON.stringify(tools[0]));
      change(tool);
      return projectProtocolSpec({ ...mcpSpec, tools: [tool as unknown as McpTool] }, [
        'tools/call search',
      ]);
    };
    const mcpBase = snapshot();

    it.each([
      [
        'a new required input',
        (tool: SearchToolDraft) => {
          tool.inputSchema.required.push('mode');
        },
        'breaking',
        'mcp-input-required-changed',
      ],
      [
        'a removed input',
        (tool: SearchToolDraft) => {
          delete tool.inputSchema.properties.mode;
        },
        'breaking',
        'mcp-input-property-removed',
      ],
      [
        'a narrowed input enum',
        (tool: SearchToolDraft) => {
          tool.inputSchema.properties.mode.enum = ['fast'];
        },
        'breaking',
        'mcp-input-enum-changed',
      ],
      [
        'a widened input enum',
        (tool: SearchToolDraft) => {
          tool.inputSchema.properties.mode.enum = ['fast', 'full', 'deep'];
        },
        'non-breaking',
        'mcp-input-enum-changed',
      ],
      [
        'a widened output enum',
        (tool: SearchToolDraft) => {
          tool.outputSchema.properties.kind.enum = ['file', 'folder'];
        },
        'breaking',
        'mcp-output-enum-changed',
      ],
      [
        'an output that may now be missing',
        (tool: SearchToolDraft) => {
          tool.outputSchema.required = [];
        },
        'breaking',
        'mcp-output-required-changed',
      ],
      [
        'a new optional input',
        (tool: SearchToolDraft) => {
          tool.inputSchema.properties.limit = { type: 'integer' };
        },
        'non-breaking',
        'mcp-input-property-added',
      ],
      [
        'a tighter bound',
        (tool: SearchToolDraft) => {
          tool.inputSchema.properties.query.maxLength = 10;
        },
        'breaking',
        'mcp-input-schema-changed',
      ],
      [
        'a tool that stops being read-only',
        (tool: SearchToolDraft) => {
          tool.annotations.readOnlyHint = false;
        },
        'breaking',
        'mcp-read-only-changed',
      ],
    ])('classifies %s in MCP', (_, change, kind, id) => {
      expect(diffOf('mcp', mcpBase, snapshot(change))).toContainEqual([kind, id]);
    });

    it('reports a removed MCP tool', () => {
      expect(diffOf('mcp', mcpBase, JSON.stringify({ tools: [] }))).toEqual([
        ['breaking', 'mcp-tool-removed'],
      ]);
    });
  });

  describe('recording and drift', () => {
    const graphQLConnector: ConnectorSpec = {
      metadata: {
        id: '.graphql_example',
        displayName: 'Example',
        description: 'Example',
        minimumLicense: 'enterprise',
        supportedFeatureIds: ['workflows'],
      },
      auth: { types: ['none'] },
      test: { enabled: false, handler: async () => ({}) },
      actions: {
        getBoard: {
          scope: 'read',
          input: z.object({}),
          handler: async ({ client }) =>
            (
              await client.post(GRAPHQL_ENDPOINT, {
                query: 'query { board(id: "1") { id state } }',
              })
            ).data,
        },
        createBoard: {
          scope: 'write',
          input: z.object({}),
          handler: async ({ client }) =>
            (
              await client.post(GRAPHQL_ENDPOINT, {
                query: 'mutation { createBoard(name: "x") { id } }',
              })
            ).data,
        },
      },
    };

    const mcpConnector: ConnectorSpec = {
      ...graphQLConnector,
      metadata: { ...graphQLConnector.metadata, id: '.mcp_example' },
      schema: z.object({ serverUrl: z.string().default(MCP_ENDPOINT) }),
      actions: {
        search: {
          scope: 'read',
          input: z.object({}),
          handler: async (ctx) => callToolJson(ctx, 'search', { query: 'x' }),
        },
      },
    };

    let directory: string;
    let documents: Record<string, string>;
    const log = { info: () => {}, warning: () => {} };
    const now = () => new Date('2026-11-04T00:00:00.000Z');
    const fetchText = async (url: string) => documents[url];
    const noDiff = async () => {
      throw new Error('oasdiff classifies OpenAPI specs only');
    };

    const recordGraphQL = (flags: { refresh?: boolean } = {}) =>
      updateVendorApi({
        connector: graphQLConnector,
        directory,
        sources: flags.refresh ? {} : { main: GRAPHQL_SPEC_URL },
        formats: flags.refresh ? {} : { main: 'graphql' },
        endpoints: flags.refresh ? {} : { main: [GRAPHQL_ENDPOINT] },
        refresh: flags.refresh,
        fetchText,
        now,
        log,
      });

    const recordMcp = () =>
      updateVendorApi({
        connector: mcpConnector,
        directory,
        sources: { main: MCP_SPEC_URL },
        formats: { main: 'mcp' },
        endpoints: { main: [MCP_ENDPOINT] },
        fetchText,
        now,
        log,
      });

    const offlineCheck = (connector: ConnectorSpec) =>
      updateVendorApi({
        connector,
        directory,
        check: true,
        fetchText: async (url) => {
          throw new Error(`Tried to fetch ${url}`);
        },
        now,
        log,
      });

    beforeEach(async () => {
      directory = await fs.mkdtemp(path.join(os.tmpdir(), 'protocol-sources-'));
      documents = { [GRAPHQL_SPEC_URL]: sdl, [MCP_SPEC_URL]: JSON.stringify({ tools }) };
    });

    afterEach(async () => {
      await fs.rm(directory, { recursive: true, force: true });
    });

    const manifestOf = async () =>
      parseManifest(await fs.readFile(path.join(directory, 'manifest.json'), 'utf8'));

    it('records a GraphQL connector, and re-records it offline without changes', async () => {
      const { changed, problems } = await recordGraphQL();
      const manifest = await manifestOf();

      expect(problems).toEqual([]);
      expect([...changed].sort()).toEqual([
        'manifest.json',
        path.join('snapshots', 'main.graphql'),
      ]);
      expect(manifest.sources.main).toMatchObject({
        format: 'graphql',
        url: GRAPHQL_SPEC_URL,
        endpoints: [GRAPHQL_ENDPOINT],
      });
      expect(manifest.operations).toEqual({
        createBoard: [{ source: 'main', name: 'mutation createBoard' }],
        getBoard: [{ source: 'main', name: 'query board' }],
      });
      expect(await offlineCheck(graphQLConnector)).toEqual({ changed: [], problems: [] });
    });

    it('records an MCP connector, and re-records it offline without changes', async () => {
      const { changed, problems } = await recordMcp();
      const manifest = await manifestOf();

      expect(problems).toEqual([]);
      expect([...changed].sort()).toEqual([
        'manifest.json',
        path.join('snapshots', 'main.mcp.json'),
      ]);
      expect(manifest.operations).toEqual({
        search: [{ source: 'main', name: 'tools/call search' }],
      });
      expect(await offlineCheck(mcpConnector)).toEqual({ changed: [], problems: [] });
    });

    it('needs endpoints for a GraphQL or MCP source, and only for those', async () => {
      const record = (formats: Record<string, 'graphql'>, endpoints: Record<string, string[]>) =>
        updateVendorApi({
          connector: graphQLConnector,
          directory,
          sources: { main: GRAPHQL_SPEC_URL },
          formats,
          endpoints,
          fetchText,
          now,
          log,
        });

      await expect(record({ main: 'graphql' }, {})).rejects.toThrow(/needs --endpoint/);
      await expect(record({}, { main: [GRAPHQL_ENDPOINT] })).rejects.toThrow(
        /--endpoint only applies/
      );
    });

    it('flags a read action that calls a GraphQL mutation or an unmarked MCP tool', async () => {
      const readWrites: ConnectorSpec = {
        ...graphQLConnector,
        actions: {
          createBoard: { ...graphQLConnector.actions.createBoard, scope: 'read' },
        },
      };
      const { problems } = await updateVendorApi({
        connector: readWrites,
        directory,
        sources: { main: GRAPHQL_SPEC_URL },
        formats: { main: 'graphql' },
        endpoints: { main: [GRAPHQL_ENDPOINT] },
        fetchText,
        now,
        log,
      });

      expect(problems).toEqual([expect.stringContaining("has scope 'read' but sent POST")]);
    });

    it('accepts a listed query for a read action that calls a mutation', async () => {
      const readWrites: ConnectorSpec = {
        ...graphQLConnector,
        actions: {
          createBoard: { ...graphQLConnector.actions.createBoard, scope: 'read' },
        },
      };
      await fs.writeFile(
        path.join(directory, 'fixtures.json'),
        JSON.stringify({ createBoard: { queries: [{ name: 'mutation createBoard' }] } })
      );
      const { problems } = await updateVendorApi({
        connector: readWrites,
        directory,
        sources: { main: GRAPHQL_SPEC_URL },
        formats: { main: 'graphql' },
        endpoints: { main: [GRAPHQL_ENDPOINT] },
        fetchText,
        now,
        log,
      });

      expect(problems).toEqual([]);
    });

    it('reports nothing when the GraphQL source only changes outside what is used', async () => {
      await recordGraphQL();
      documents[GRAPHQL_SPEC_URL] = sdl.replace('type Unused {', 'type Unused {\n  more: Int');

      const drift = await detectDrift({
        connector: graphQLConnector,
        directory,
        fetchText,
        now,
        log,
        diff: noDiff,
      });

      expect(drift).toMatchObject({
        sources: { main: { status: 'unchanged' } },
        verdict: 'healthy',
        outcome: 'none',
      });
    });

    it('wants a refresh for a new GraphQL field, without touching the committed files', async () => {
      await recordGraphQL();
      const before = await fs.readFile(path.join(directory, 'snapshots', 'main.graphql'), 'utf8');
      documents[GRAPHQL_SPEC_URL] = sdl.replace(
        'owner: Owner\n  state: State\n}',
        'owner: Owner\n  state: State\n  name: String\n}'
      );

      const drift = await detectDrift({
        connector: graphQLConnector,
        directory,
        fetchText,
        now,
        log,
        diff: noDiff,
      });

      expect(drift.outcome).toBe('refresh');
      expect(drift.verdict).toBe('healthy');
      expect(drift.sources.main.changes).toEqual([
        expect.objectContaining({ kind: 'non-breaking', id: 'FIELD_ADDED' }),
      ]);
      expect(await fs.readFile(path.join(directory, 'snapshots', 'main.graphql'), 'utf8')).toBe(
        before
      );
    });

    it('files an issue when a field the connector selects is removed from GraphQL', async () => {
      await recordGraphQL();
      documents[GRAPHQL_SPEC_URL] = sdl.replace('  state: State\n}\n\nunion', '}\n\nunion');

      const drift = await detectDrift({
        connector: graphQLConnector,
        directory,
        fetchText,
        now,
        log,
        diff: noDiff,
      });

      expect(drift.verdict).toBe('vendor-drift');
      expect(drift.outcome).toBe('issue');
      expect(drift.sources.main.changes).toContainEqual(
        expect.objectContaining({ kind: 'breaking', id: 'FIELD_REMOVED' })
      );
    });

    it('files an issue when an MCP tool gains a required input the connector omits', async () => {
      await recordMcp();
      const [search, ...others] = tools;
      documents[MCP_SPEC_URL] = JSON.stringify({
        tools: [
          {
            ...search,
            inputSchema: {
              ...search.inputSchema,
              required: ['query', 'mode'],
            },
          },
          ...others,
        ],
      });

      const drift = await detectDrift({
        connector: mcpConnector,
        directory,
        fetchText,
        now,
        log,
        diff: noDiff,
      });

      expect(drift.verdict).toBe('vendor-drift');
      expect(drift.outcome).toBe('issue');
      expect(drift.sources.main.changes).toContainEqual(
        expect.objectContaining({ kind: 'breaking', id: 'mcp-input-required-changed' })
      );
    });

    it('reports a source that serves something else as unreachable', async () => {
      await recordGraphQL();
      documents[GRAPHQL_SPEC_URL] = '{ "error": "unauthorized" }';

      const drift = await detectDrift({
        connector: graphQLConnector,
        directory,
        fetchText,
        now,
        log,
        diff: noDiff,
      });

      expect(drift.sources.main.status).toBe('unreachable');
      expect(drift.verdict).toBe('unknown');
    });

    it('refreshes a GraphQL source from its URL', async () => {
      await recordGraphQL();
      documents[GRAPHQL_SPEC_URL] = sdl.replace(
        'owner: Owner\n  state: State\n}',
        'owner: Owner\n  state: State\n  name: String\n}'
      );

      const { changed } = await recordGraphQL({ refresh: true });

      expect(changed).toContain(path.join('snapshots', 'main.graphql'));
      expect(
        await fs.readFile(path.join(directory, 'snapshots', 'main.graphql'), 'utf8')
      ).toContain('name: String');
    });
  });
});
