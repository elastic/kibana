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

    it('keeps a root type whole when a result field reaches it', () => {
      const projected = project(
        'type Query { board: Board, other: String } type Board { parent: Query } type Mutation { create: String }',
        ['query board']
      );

      expect(projected).toContain('other: String');
      expect(projected).not.toContain('Mutation');
    });

    it('expands an interface only when a field returns it, not when a type implements it', () => {
      const relay = `
        type Query { board: Board, node: Node }
        interface Node { id: ID! }
        type Board implements Node { id: ID! }
        type Card implements Node { id: ID! }
      `;

      const viaImplements = project(relay, ['query board']);
      expect(viaImplements).toContain('interface Node');
      expect(viaImplements).not.toContain('type Card');
      expect(() => buildSchema(viaImplements)).not.toThrow();
      expect(project(relay, ['query node'])).toContain('type Card');
    });

    it('expands an interface a kept type implements when a later field returns it', () => {
      const projected = project(
        `
        type Query { board: Board }
        interface Node { id: ID! }
        type Board implements Node { id: ID!, parent: Node }
        type Card implements Node { id: ID! }
      `,
        ['query board']
      );

      expect(projected).toContain('type Card');
    });

    it('keeps directives operations can use, with their argument types, and drops the others', () => {
      const projected = project(
        `
        directive @cost(weight: Weight) on FIELD
        directive @internal on FIELD_DEFINITION
        type Query { board: String, other: Other }
        input Weight { value: Int }
        type Other { id: ID }
      `,
        ['query board']
      );

      expect(projected).toContain('directive @cost(weight: Weight) on FIELD');
      expect(projected).toContain('input Weight');
      expect(projected).not.toContain('@internal');
      expect(projected).not.toContain('Other');
      expect(() => buildSchema(projected)).not.toThrow();
    });

    it('keeps names in JSON Schema maps that look like documentation', () => {
      const inputSchema = {
        type: 'object',
        dependentRequired: { description: ['title'], title: ['description'] },
        dependencies: { $comment: ['title'], examples: { required: ['title'] } },
      };

      const { tools: projected } = JSON.parse(
        projectProtocolSpec({ ...mcpSpec, tools: [{ name: 'search', inputSchema }] }, ['search'])
      );

      expect(projected[0].inputSchema).toEqual(inputSchema);
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
        'DEPRECATION_ADDED',
      ],
    ])('classifies %s in GraphQL', (_, current, kind, id) => {
      expect(diffOf('graphql', base, current)).toContainEqual([kind, id]);
    });

    it('treats a value added to an enum only requests send as non-breaking', () => {
      const inputOnly = (values: string) =>
        project(
          `type Query { boards(state: State): Board } type Board { id: ID! } enum State { ${values} }`,
          ['query boards']
        );

      expect(diffOf('graphql', inputOnly('OPEN'), inputOnly('OPEN CLOSED'))).toContainEqual([
        'non-breaking',
        'VALUE_ADDED_TO_ENUM',
      ]);
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
        'a new enum on an input that had none',
        (tool: SearchToolDraft) => {
          tool.inputSchema.properties.query.enum = ['only'];
        },
        'breaking',
        'mcp-input-enum-changed',
      ],
      [
        'an enum dropped from an input',
        (tool: SearchToolDraft) => {
          delete tool.inputSchema.properties.mode.enum;
        },
        'non-breaking',
        'mcp-input-enum-changed',
      ],
      [
        'an enum dropped from an output',
        (tool: SearchToolDraft) => {
          delete tool.outputSchema.properties.kind.enum;
        },
        'breaking',
        'mcp-output-enum-changed',
      ],
      [
        'a new enum on an output that had none',
        (tool: SearchToolDraft) => {
          tool.outputSchema.properties.total.enum = [1];
        },
        'non-breaking',
        'mcp-output-enum-changed',
      ],
      [
        'a type dropped from an output',
        (tool: SearchToolDraft) => {
          delete tool.outputSchema.properties.total.type;
        },
        'breaking',
        'mcp-output-type-changed',
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

    it('treats a tool gaining readOnlyHint, or dropping it explicitly, as non-breaking', () => {
      const readOnly = (hint: boolean | undefined) =>
        JSON.stringify({
          tools: [
            {
              name: 'search',
              inputSchema: { type: 'object' },
              ...(hint === undefined ? {} : { annotations: { readOnlyHint: hint } }),
            },
          ],
        });

      expect(diffOf('mcp', readOnly(undefined), readOnly(true))).toEqual([
        ['non-breaking', 'mcp-read-only-changed'],
      ]);
      expect(diffOf('mcp', readOnly(undefined), readOnly(false))).toEqual([]);
      expect(diffOf('mcp', readOnly(true), readOnly(undefined))).toEqual([
        ['breaking', 'mcp-read-only-changed'],
      ]);
    });

    it('compares enum values by content, so unchanged objects are no change', () => {
      const withEnum = (values: unknown[]) =>
        projectProtocolSpec(
          {
            ...mcpSpec,
            tools: [
              {
                name: 'search',
                inputSchema: { type: 'object', properties: { a: { enum: values } } },
              },
            ],
          },
          ['search']
        );

      expect(diffOf('mcp', withEnum([{ kind: 'a' }]), withEnum([{ kind: 'a' }]))).toEqual([]);
      expect(diffOf('mcp', withEnum([{ kind: 'a' }]), withEnum([{ kind: 'b' }]))).toContainEqual([
        'breaking',
        'mcp-input-enum-changed',
      ]);
    });

    it('reports deprecated GraphQL arguments, fields and enum values', () => {
      const withDeprecated = (argument: string, field: string, value: string) =>
        project(
          `type Query { board(a: Int${argument}): Board } type Board { id: ID${field}, state: State } enum State { OPEN${value} }`,
          ['query board']
        );
      const deprecated = ' @deprecated(reason: "gone")';
      const undeprecated = withDeprecated('', '', '');

      for (const current of [
        withDeprecated(deprecated, '', ''),
        withDeprecated('', deprecated, ''),
        withDeprecated('', '', deprecated),
      ]) {
        expect(diffOf('graphql', undeprecated, current)).toEqual([
          ['deprecation', 'DEPRECATION_ADDED'],
        ]);
      }
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

    const recordQuery = async (schema: string, query: string) => {
      documents[GRAPHQL_SPEC_URL] = schema;
      const connector: ConnectorSpec = {
        ...graphQLConnector,
        actions: {
          run: {
            scope: 'read',
            input: z.object({}),
            handler: async ({ client }) => (await client.post(GRAPHQL_ENDPOINT, { query })).data,
          },
        },
      };
      const recorded = await updateVendorApi({
        connector,
        directory,
        sources: { main: GRAPHQL_SPEC_URL },
        formats: { main: 'graphql' },
        endpoints: { main: [GRAPHQL_ENDPOINT] },
        fetchText,
        now,
        log,
      });
      return { recorded, offline: await offlineCheck(connector) };
    };

    it('re-records offline a query that reaches a root type through a field', async () => {
      const { recorded, offline } = await recordQuery(
        'type Query { board: Board, other: String } type Board { parent: Query }',
        'query { board { parent { other } } }'
      );

      expect(recorded.problems).toEqual([]);
      expect(offline).toEqual({ changed: [], problems: [] });
    });

    it('re-records offline a query that uses a custom directive', async () => {
      const { recorded, offline } = await recordQuery(
        'directive @cost(weight: Int) on FIELD type Query { board: String }',
        'query { board @cost(weight: 1) }'
      );

      expect(recorded.problems).toEqual([]);
      expect(offline).toEqual({ changed: [], problems: [] });
    });

    it('re-records offline a fragment that names a type the root field does not reach', async () => {
      const { recorded, offline } = await recordQuery(
        `
        type Query { board: Board }
        interface Node { id: ID! }
        type Board implements Node { id: ID! }
        type Card implements Node { id: ID!, title: String }
        type Unused implements Node { id: ID! }
      `,
        'query { board { ...NodeFields } } fragment NodeFields on Node { id ... on Card { title } }'
      );

      expect(recorded.problems).toEqual([]);
      expect(offline).toEqual({ changed: [], problems: [] });
      const snapshot = await fs.readFile(path.join(directory, 'snapshots', 'main.graphql'), 'utf8');
      expect(snapshot).toContain('type Card');
      expect(snapshot).not.toContain('Unused');
    });

    it('re-records offline a fragment spread between interfaces that share an object', async () => {
      const { recorded, offline } = await recordQuery(
        `
        type Query { holder: Holder }
        interface Named { id: ID! }
        interface Titled { id: ID! }
        type Holder implements Named { id: ID! }
        type Both implements Named & Titled { id: ID! }
        type OnlyTitled implements Titled { id: ID! }
      `,
        'query { holder { ...N } } fragment N on Named { id ... on Titled { id } }'
      );

      expect(recorded.problems).toEqual([]);
      expect(offline).toEqual({ changed: [], problems: [] });
      const snapshot = await fs.readFile(path.join(directory, 'snapshots', 'main.graphql'), 'utf8');
      expect(snapshot).toContain('type Both');
      expect(snapshot).not.toContain('OnlyTitled');
    });

    it('re-records offline a read query whose every root field is skipped', async () => {
      const { recorded, offline } = await recordQuery(
        'type Query { a: String, b: String }',
        'query { b @skip(if: true) }'
      );

      expect(recorded.problems).toEqual([]);
      expect(offline).toEqual({ changed: [], problems: [] });
      const snapshot = await fs.readFile(path.join(directory, 'snapshots', 'main.graphql'), 'utf8');
      expect(snapshot).toContain('b: String');
      expect((await manifestOf()).operations.run).toEqual([]);
    });

    it('re-records offline a root type that implements an interface with unused fields', async () => {
      const { recorded, offline } = await recordQuery(
        'interface Root { a: String, b: Other } type Query implements Root { a: String, b: Other } type Other { id: ID }',
        'query { a }'
      );

      expect(recorded.problems).toEqual([]);
      expect(offline).toEqual({ changed: [], problems: [] });
    });

    it('keeps only the root fields used when a fragment names the root type', async () => {
      const { recorded, offline } = await recordQuery(
        'type Query { used: String, unused: Unused } type Unused { id: ID }',
        'query { ...Roots } fragment Roots on Query { used }'
      );

      expect(recorded.problems).toEqual([]);
      expect(offline).toEqual({ changed: [], problems: [] });
      const snapshot = await fs.readFile(path.join(directory, 'snapshots', 'main.graphql'), 'utf8');
      expect(snapshot).toContain('used: String');
      expect(snapshot).not.toContain('nused');
    });

    it.each([
      [
        'another operation of the document',
        'query { ...Roots } fragment Roots on Query { unused }\nquery Selected { used }',
      ],
      ['a root field @skip drops', 'query { used unused @skip(if: true) }'],
      ['an operation of another type', 'mutation Other { create } query Selected { used }'],
    ])('keeps the root fields the document needs to validate: %s', async (_, query) => {
      const schema =
        'type Query { used: String, unused: String, neverNamed: Other } type Other { id: ID } type Mutation { create: String, neverNamed: Other }';
      documents[GRAPHQL_SPEC_URL] = schema;
      const named = query.includes('Selected')
        ? {
            query: query.replace('query { ...Roots }', 'query Other { ...Roots }'),
            operationName: 'Selected',
          }
        : { query };
      const connector: ConnectorSpec = {
        ...graphQLConnector,
        actions: {
          run: {
            scope: 'write',
            input: z.object({}),
            handler: async ({ client }) => (await client.post(GRAPHQL_ENDPOINT, named)).data,
          },
        },
      };

      const recorded = await updateVendorApi({
        connector,
        directory,
        sources: { main: GRAPHQL_SPEC_URL },
        formats: { main: 'graphql' },
        endpoints: { main: [GRAPHQL_ENDPOINT] },
        fetchText,
        now,
        log,
      });

      expect(recorded.problems).toEqual([]);
      expect(await offlineCheck(connector)).toEqual({ changed: [], problems: [] });
      expect((await manifestOf()).operations.run).toEqual([{ source: 'main', name: 'query used' }]);
      expect(
        await fs.readFile(path.join(directory, 'snapshots', 'main.graphql'), 'utf8')
      ).not.toContain('neverNamed');
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
