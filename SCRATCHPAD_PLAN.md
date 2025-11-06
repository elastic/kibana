# Scratchpad App - High-Level Implementation Plan

## Overview
Create a new Kibana app called "Scratchpad" that implements a canvas-driven workflow with:
- **Full-width canvas**: Interactive mindmap-style graph (scratchpad) where users and LLM can collaboratively add/manipulate nodes
- **AI Assistant Integration**: The Kibana chrome provides the chat interface; the app provides context and UI actions to the assistant
- **Bidirectional interaction**: LLM can read scratchpad state and perform UI actions to modify it through the observabilityAIAssistant

## Architecture

### 1. Plugin Structure

#### 1.1 Plugin Location
- **Path**: `x-pack/platform/plugins/shared/scratchpad_app/`
- **Type**: Shared platform plugin (similar to `streams_app`)
- **Plugin ID**: `scratchpadApp`

#### 1.2 Plugin Registration (`kibana.jsonc`)
```jsonc
{
  "type": "plugin",
  "id": "@kbn/scratchpad-app-plugin",
  "owner": "@elastic/[team]",
  "group": "platform",
  "visibility": "shared",
  "plugin": {
    "id": "scratchpadApp",
    "server": true,
    "browser": true,
    "configPath": ["xpack", "scratchpadApp"],
    "requiredPlugins": [
      "data",           // For ESQL queries and time picker
      "dataViews",      // For data view management
      "charts",         // For rendering ESQL results as charts
      "share",          // For generating Kibana links
      "navigation"      // For side nav integration
    ],
    "optionalPlugins": [
      "observabilityAIAssistant"  // For chat functionality (if available)
    ],
    "requiredBundles": [
      "kibanaReact",
      "kibanaUtils"
    ]
  }
}
```

#### 1.3 App Registration
- Register app in `public/plugin.tsx` `setup()` method
- Use `coreSetup.application.register()` similar to streams_app
- App route: `/app/scratchpad`
- Category: `DEFAULT_APP_CATEGORIES.management` or custom category
- Visible in: `['sideNav', 'globalSearch']`

### 2. Core Components

#### 2.1 Main Application Layout
```
ScratchpadApp
└── ScratchpadCanvas (full width)
    ├── GraphRenderer
    ├── NodeRenderer (for each node type)
    └── GraphControls (zoom, pan, fit view)
```

**Note**: The chat interface is provided by Kibana chrome (observabilityAIAssistant). The app integrates with it by providing screen context and UI actions.

#### 2.2 Graph Rendering
- **Library**: ReactFlow (already used in Kibana - see `workflows_management` and security packages)
- **Node Types**:
  - `ESQLQueryNode`: Displays ESQL query with results/chart
  - `TextNoteNode`: Displays text content
  - `KibanaLinkNode`: Displays link to Kibana location with copy button
- **Graph State**: Managed in React state, persisted to localStorage
- **Layout**: Auto-layout algorithm (force-directed or hierarchical)

#### 2.3 Node Types Implementation

##### 2.3.1 ESQL Query Node
- **Structure**:
  ```typescript
  interface ESQLQueryNode {
    id: string;
    type: 'esql_query';
    position: { x: number; y: number };
    data: {
      query: string;
      timeRange?: { start: string; end: string };
      results?: ESQLResults;
      chartConfig?: ChartConfig;
    };
  }
  ```
- **Features**:
  - Inline ESQL editor (can use `@kbn/esql-editor` package)
  - Time picker component (`EuiSuperDatePicker`)
  - Execute query button
  - Results display (table or chart)
  - Chart rendering using `@kbn/charts-plugin` (similar to dashboard panels)
  - Loading/error states

##### 2.3.2 Text Note Node
- **Structure**:
  ```typescript
  interface TextNoteNode {
    id: string;
    type: 'text_note';
    position: { x: number; y: number };
    data: {
      content: string;
      title?: string;
    };
  }
  ```
- **Features**:
  - Editable text content
  - Markdown support (optional)

##### 2.3.3 Kibana Link Node
- **Structure**:
  ```typescript
  interface KibanaLinkNode {
    id: string;
    type: 'kibana_link';
    position: { x: number; y: number };
    data: {
      url: string;
      title: string;
      description?: string;
      appId: string;  // e.g., 'discover', 'dashboard'
    };
  }
  ```
- **Features**:
  - Display link preview
  - Copy link button (copies to clipboard)
  - Click to navigate

#### 2.4 State Management

##### 2.4.1 Graph State
```typescript
interface ScratchpadState {
  nodes: Node[];
  edges: Edge[];
  version: number;  // For optimistic updates
}
```

##### 2.4.2 Persistence
- **Storage**: localStorage (POC)
- **Key**: `kibana.scratchpad.state`
- **Format**: JSON serialization of graph state
- **Sync**: Load on mount, save on changes (debounced)

#### 2.5 AI Assistant Integration (observabilityAIAssistant)

The app integrates with the Kibana chrome's AI assistant by providing screen context and UI actions. This follows the pattern used in `streams_app` (see `useStreamRoutingScreenContext`).

##### 2.5.1 Screen Context Hook
Create `useScratchpadScreenContext` hook that:
- Provides **summary** of current graph state to the LLM (kept minimal for token efficiency)
- Registers UI actions the LLM can call (actions are bi-directional - they can return data)
- Updates context when graph state changes

**Key Considerations**:
- **Context Data Limits**: Only data < 1000 tokens is sent automatically. Keep summaries in context, provide detailed read actions.
- **ESQL Execution**: Already available via observabilityAIAssistant's built-in `query` function - no need to expose it.
- **Bi-directional Actions**: Actions can return data via `FunctionResponse`, allowing the LLM to read node details on-demand.

**Implementation Pattern** (based on streams_app and dashboard examples):
```typescript
export function useScratchpadScreenContext({
  nodes,
  edges,
  addNode,
  updateNode,
  deleteNode,
  createEdge,
}: UseScratchpadScreenContextOptions) {
  const { dependencies: { start: { observabilityAIAssistant } } } = useKibana();

  useEffect(() => {
    if (!observabilityAIAssistant) return;

    const { service: { setScreenContext }, createScreenContextAction } = observabilityAIAssistant;

    // Prepare minimal context data (summary only - detailed data available via read actions)
    // Keep under 1000 tokens to be sent automatically
    const contextData = [
      {
        name: 'scratchpad_summary',
        description: 'Summary of the scratchpad graph state',
        value: {
          nodeCount: nodes.length,
          edgeCount: edges.length,
          nodeTypes: {
            esql_query: nodes.filter(n => n.type === 'esql_query').length,
            text_note: nodes.filter(n => n.type === 'text_note').length,
            kibana_link: nodes.filter(n => n.type === 'kibana_link').length,
          },
          // Only include node IDs and types - full details available via read_node action
          nodeIds: nodes.map(n => ({ id: n.id, type: n.type })),
          // Edge summary
          edges: edges.map(e => ({ source: e.source, target: e.target })),
        },
      },
    ];

    return setScreenContext({
      screenDescription: `The user is working on a scratchpad with ${nodes.length} node(s) and ${edges.length} connection(s). The scratchpad is a mindmap-style graph where nodes can be ESQL queries, text notes, or links to Kibana locations. Users can add nodes, connect them with edges, and view ESQL query results. Note: To execute ESQL queries, use the built-in "query" function - ESQL query nodes display queries but execution is handled separately.`,
      data: contextData,
      actions: [
        // Read Node Details (bi-directional - returns full node data)
        createScreenContextAction({
          name: 'read_node',
          description: 'Read the full details of a specific node in the scratchpad. Use this to get complete information about a node including its content, query, results, etc.',
          parameters: {
            type: 'object',
            properties: {
              nodeId: {
                type: 'string',
                description: 'The ID of the node to read',
              },
            },
            required: ['nodeId'],
          } as const,
        }, async ({ args }) => {
          try {
            const node = nodes.find(n => n.id === args.nodeId);
            if (!node) {
              return {
                content: {
                  error: `Node with ID "${args.nodeId}" not found`,
                },
              };
            }
            return {
              content: {
                node: {
                  id: node.id,
                  type: node.type,
                  position: node.position,
                  data: node.data,
                },
              },
            };
          } catch (error) {
            return {
              content: {
                error: error instanceof Error ? error.message : 'Unknown error occurred',
              },
            };
          }
        }),

        // Add ESQL Query Node
        createScreenContextAction({
          name: 'add_esql_query_node',
          description: 'Add a new ESQL query node to the scratchpad. The node displays the query. Note: To execute ESQL queries, use the built-in "query" function instead. This action only creates the node.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The ESQL query to execute',
              },
              timeRange: {
                type: 'object',
                properties: {
                  start: { type: 'string' },
                  end: { type: 'string' },
                },
                description: 'Optional time range for the query',
              },
              position: {
                type: 'object',
                properties: {
                  x: { type: 'number' },
                  y: { type: 'number' },
                },
                description: 'Optional position for the node. If not provided, will be auto-positioned.',
              },
            },
            required: ['query'],
          } as const,
        }, async ({ args }) => {
          try {
            const nodeId = addNode({
              type: 'esql_query',
              data: {
                query: args.query,
                timeRange: args.timeRange,
              },
              position: args.position || getAutoPosition(),
            });
            return {
              content: `Successfully added ESQL query node "${nodeId}" to the scratchpad.`,
            };
          } catch (error) {
            return {
              content: {
                error: error instanceof Error ? error.message : 'Unknown error occurred',
              },
            };
          }
        }),

        // Add Text Note Node
        createScreenContextAction({
          name: 'add_text_note_node',
          description: 'Add a new text note node to the scratchpad for storing notes or documentation.',
          parameters: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: 'The text content of the note',
              },
              title: {
                type: 'string',
                description: 'Optional title for the note',
              },
              position: {
                type: 'object',
                properties: {
                  x: { type: 'number' },
                  y: { type: 'number' },
                },
                description: 'Optional position for the node',
              },
            },
            required: ['content'],
          } as const,
        }, async ({ args }) => {
          try {
            const nodeId = addNode({
              type: 'text_note',
              data: {
                content: args.content,
                title: args.title,
              },
              position: args.position || getAutoPosition(),
            });
            return {
              content: `Successfully added text note node "${nodeId}" to the scratchpad.`,
            };
          } catch (error) {
            return {
              content: {
                error: error instanceof Error ? error.message : 'Unknown error occurred',
              },
            };
          }
        }),

        // Add Kibana Link Node
        createScreenContextAction({
          name: 'add_kibana_link_node',
          description: 'Add a new link node that references a location in Kibana (e.g., Discover session, Dashboard).',
          parameters: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'The Kibana URL to link to',
              },
              title: {
                type: 'string',
                description: 'Display title for the link',
              },
              description: {
                type: 'string',
                description: 'Optional description of what the link points to',
              },
              appId: {
                type: 'string',
                description: 'The Kibana app ID (e.g., "discover", "dashboard")',
              },
              position: {
                type: 'object',
                properties: {
                  x: { type: 'number' },
                  y: { type: 'number' },
                },
                description: 'Optional position for the node',
              },
            },
            required: ['url', 'title', 'appId'],
          } as const,
        }, async ({ args }) => {
          try {
            const nodeId = addNode({
              type: 'kibana_link',
              data: {
                url: args.url,
                title: args.title,
                description: args.description,
                appId: args.appId,
              },
              position: args.position || getAutoPosition(),
            });
            return {
              content: `Successfully added Kibana link node "${nodeId}" to the scratchpad.`,
            };
          } catch (error) {
            return {
              content: {
                error: error instanceof Error ? error.message : 'Unknown error occurred',
              },
            };
          }
        }),

        // Update Node
        createScreenContextAction({
          name: 'update_node',
          description: 'Update an existing node in the scratchpad. Can update query, content, or other node properties.',
          parameters: {
            type: 'object',
            properties: {
              nodeId: {
                type: 'string',
                description: 'The ID of the node to update',
              },
              updates: {
                type: 'object',
                properties: {},
                description: 'The updates to apply. Structure depends on node type.',
              },
            },
            required: ['nodeId', 'updates'],
          } as const,
        }, async ({ args }) => {
          try {
            updateNode(args.nodeId, args.updates);
            return {
              content: `Successfully updated node "${args.nodeId}".`,
            };
          } catch (error) {
            return {
              content: {
                error: error instanceof Error ? error.message : 'Unknown error occurred',
              },
            };
          }
        }),

        // Delete Node
        createScreenContextAction({
          name: 'delete_node',
          description: 'Delete a node from the scratchpad. This will also remove any edges connected to it.',
          parameters: {
            type: 'object',
            properties: {
              nodeId: {
                type: 'string',
                description: 'The ID of the node to delete',
              },
            },
            required: ['nodeId'],
          } as const,
        }, async ({ args }) => {
          try {
            deleteNode(args.nodeId);
            return {
              content: `Successfully deleted node "${args.nodeId}".`,
            };
          } catch (error) {
            return {
              content: {
                error: error instanceof Error ? error.message : 'Unknown error occurred',
              },
            };
          }
        }),

        // Create Edge
        createScreenContextAction({
          name: 'create_edge',
          description: 'Create a connection/edge between two nodes in the scratchpad.',
          parameters: {
            type: 'object',
            properties: {
              sourceId: {
                type: 'string',
                description: 'The ID of the source node',
              },
              targetId: {
                type: 'string',
                description: 'The ID of the target node',
              },
            },
            required: ['sourceId', 'targetId'],
          } as const,
        }, async ({ args }) => {
          try {
            createEdge(args.sourceId, args.targetId);
            return {
              content: `Successfully created edge from node "${args.sourceId}" to node "${args.targetId}".`,
            };
          } catch (error) {
            return {
              content: {
                error: error instanceof Error ? error.message : 'Unknown error occurred',
              },
            };
          }
        }),
      ],
    });
  }, [
    observabilityAIAssistant,
    nodes,
    edges,
    addNode,
    updateNode,
    deleteNode,
    createEdge,
  ]);
}
```

##### 2.5.2 Integration Points
- **Hook Usage**: Call `useScratchpadScreenContext` in the main application component
- **Context Updates**: Hook automatically updates when nodes/edges change
- **Action Handlers**: Actions call state management functions to modify the graph
- **Bi-directional Actions**: Actions can return data (e.g., `read_node` returns full node details)
- **Error Handling**: All actions return structured responses with success/error messages
- **Context Data Strategy**: 
  - Keep summary data in context (< 1000 tokens for auto-send)
  - Provide `read_node` action for detailed node information on-demand
  - LLM can use `get_data_on_screen` function to access context data if needed

### 3. ESQL Query Execution

#### 3.1 Query Execution Options
1. **Use Data Plugin Search API** (Recommended)
   - `pluginsStart.data.search.search()` with `strategy: 'esql_async'`
   - Similar to how `getESQLResults()` works in `@kbn/esql-utils`
   - Supports time range filtering

2. **Custom Endpoint** (Alternative)
   - Create `/internal/scratchpad/esql` endpoint
   - Similar to streams_app's `/internal/streams/esql`
   - Use `scopedClusterClient.asCurrentUser.esql.query()`

#### 3.2 Chart Rendering
- Use `@kbn/charts-plugin` for visualization
- Convert ESQL results to chart-friendly format
- Support common chart types: bar, line, area, pie
- Use `@kbn/vis-types` if more complex visualizations needed

### 4. AI Assistant Integration Details

#### 4.1 Integration Pattern
The integration follows the same pattern as `streams_app`:
- Use `observabilityAIAssistant.service.setScreenContext()` to provide context
- Use `observabilityAIAssistant.createScreenContextAction()` to register actions
- Context is automatically updated when graph state changes
- Actions are available to the LLM through the Kibana chrome chat interface

#### 4.2 Context Structure
The screen context includes:
- **Screen Description**: Human-readable description of current state
- **Data**: Structured data about the graph (nodes, edges, counts)
- **Actions**: Array of actions the LLM can invoke

#### 4.3 Action Implementation
Each action:
- Has a name, description, and parameter schema
- Returns structured responses (success or error) - **actions are bi-directional**
- Calls state management functions to modify the graph
- Handles errors gracefully
- Can return data (e.g., `read_node` returns full node details)

**Available Actions**:
1. `read_node` - Read full details of a node (returns node data)
2. `add_esql_query_node` - Add ESQL query node (creates node, doesn't execute query)
3. `add_text_note_node` - Add text note node
4. `add_kibana_link_node` - Add Kibana link node
5. `update_node` - Update existing node
6. `delete_node` - Delete node
7. `create_edge` - Create connection between nodes

**Note**: ESQL query execution is handled by observabilityAIAssistant's built-in `query` function, not exposed as an action.

#### 4.4 Hook Dependencies
The `useScratchpadScreenContext` hook depends on:
- `observabilityAIAssistant` plugin (optional)
- Current graph state (nodes, edges)
- State mutation functions (addNode, updateNode, etc.)
- Auto-positioning helper for new nodes

#### 4.5 Context Data Strategy
- **Screen Description**: Always sent - provides natural language summary
- **Summary Data**: Minimal metadata (< 1000 tokens) - node counts, types, IDs
- **Detailed Data**: Available via `read_node` action - LLM requests on-demand
- **Why This Approach**:
  - Reduces token costs (only summary sent initially)
  - Allows LLM to request details when needed
  - Prevents context bloat with large graphs
  - Follows observabilityAIAssistant best practices

### 5. Implementation Phases

#### Phase 1: Basic Plugin & App Registration
- [ ] Create plugin structure (`kibana.jsonc`, `public/plugin.tsx`, `server/plugin.ts`)
- [ ] Register app in side navigation
- [ ] Create basic app layout (full-width canvas)
- [ ] Set up routing

#### Phase 2: Graph Rendering
- [ ] Install/integrate ReactFlow
- [ ] Create basic graph component
- [ ] Implement node rendering (simple shapes first)
- [ ] Add graph controls (zoom, pan, fit view)
- [ ] Implement basic node dragging

#### Phase 3: Node Types
- [ ] Implement TextNoteNode
- [ ] Implement ESQLQueryNode (basic query input)
- [ ] Implement KibanaLinkNode
- [ ] Add node type selection UI

#### Phase 4: State Management
- [ ] Implement state management (React state)
- [ ] Add localStorage persistence
- [ ] Implement state loading/saving
- [ ] Add state versioning for optimistic updates

#### Phase 5: ESQL Integration
- [ ] Integrate ESQL query execution
- [ ] Add time picker to ESQL nodes
- [ ] Implement results display (table)
- [ ] Add chart rendering for ESQL results

#### Phase 6: AI Assistant Integration
- [ ] Create `useScratchpadScreenContext` hook
- [ ] Implement minimal context data structure (summary only)
- [ ] Register UI actions:
  - [ ] `read_node` - Read full node details (bi-directional)
  - [ ] `add_esql_query_node` - Add ESQL query node
  - [ ] `add_text_note_node` - Add text note node
  - [ ] `add_kibana_link_node` - Add Kibana link node
  - [ ] `update_node` - Update existing node
  - [ ] `delete_node` - Delete node
  - [ ] `create_edge` - Create connection between nodes
- [ ] Test actions from Kibana chrome chat interface
- [ ] Verify bi-directional data flow (read_node returns data)
- [ ] Handle errors and edge cases
- [ ] Note: ESQL execution handled by built-in `query` function (no action needed)

#### Phase 7: Polish & Enhancements
- [ ] Add edge creation UI
- [ ] Improve graph layout algorithm
- [ ] Add node styling/theming
- [ ] Add keyboard shortcuts
- [ ] Improve error handling
- [ ] Add loading states

### 6. File Structure

```
x-pack/platform/plugins/shared/scratchpad_app/
├── kibana.jsonc
├── public/
│   ├── index.ts
│   ├── plugin.tsx
│   ├── types.ts
│   ├── application.tsx
│   ├── components/
│   │   ├── scratchpad_layout/
│   │   │   ├── scratchpad_layout.tsx
│   │   │   └── index.ts
│   │   ├── graph/
│   │   │   ├── graph_renderer.tsx
│   │   │   ├── graph_controls.tsx
│   │   │   └── index.ts
│   │   ├── nodes/
│   │   │   ├── esql_query_node.tsx
│   │   │   ├── text_note_node.tsx
│   │   │   ├── kibana_link_node.tsx
│   │   │   └── index.ts
│   │   └── esql_panel/
│   │       ├── esql_panel.tsx
│   │       ├── esql_editor.tsx
│   │       ├── esql_results.tsx
│   │       └── index.ts
│   ├── hooks/
│   │   ├── use_scratchpad_state.ts
│   │   ├── use_esql_query.ts
│   │   └── use_scratchpad_screen_context.ts
│   └── services/
│       ├── state_service.ts
│       └── types.ts
├── server/
│   ├── index.ts
│   ├── plugin.ts
│   ├── types.ts
│   └── routes/
│       └── esql.ts (if custom endpoint needed)
└── common/
    ├── types.ts
    └── constants.ts
```

### 7. Key Dependencies

#### 7.1 Required Plugins
- `data`: ESQL queries, time picker
- `dataViews`: Data view management
- `charts`: Chart rendering
- `share`: Link generation
- `navigation`: Side nav integration

#### 7.2 Optional Plugins
- `observabilityAIAssistant`: Chat functionality

#### 7.3 Packages
- `@kbn/esql-editor`: ESQL query editor
- `reactflow`: Graph rendering (check if already bundled)
- `@kbn/charts-plugin`: Chart visualizations
- `@kbn/i18n`: Internationalization

### 8. Technical Considerations

#### 8.1 Graph Layout
- Use ReactFlow's built-in layout or custom algorithm
- Consider force-directed layout for mindmap style
- Auto-layout on node addition

#### 8.2 Performance
- Virtualize large graphs (ReactFlow supports this)
- Debounce state saves to localStorage
- Lazy load node content

#### 8.3 State Synchronization
- Consider using Redux or Zustand for complex state
- Optimistic updates for LLM actions
- Conflict resolution for concurrent edits

#### 8.4 Error Handling
- Handle ESQL query errors gracefully
- Show error states in nodes
- Retry mechanisms for failed queries

### 9. Testing Strategy

#### 9.1 Unit Tests
- State management functions
- Node type components
- UI action handlers

#### 9.2 Integration Tests
- Graph rendering
- ESQL query execution
- State persistence

#### 9.3 E2E Tests
- User workflow: add node, execute query, view results
- AI Assistant workflow: LLM adds node via chat, modifies state through actions

### 10. Future Enhancements

- **Collaboration**: Multi-user editing (WebSockets)
- **Persistence**: Server-side storage (saved objects)
- **Templates**: Pre-built graph templates
- **Export**: Export graph as image/PDF
- **Advanced Charts**: More chart types, custom visualizations
- **Node Relationships**: Automatic relationship detection
- **Search**: Search nodes by content
- **History**: Undo/redo functionality

## Next Steps

1. Review and approve this plan
2. Set up plugin structure
3. Begin Phase 1 implementation
4. Iterate based on feedback

