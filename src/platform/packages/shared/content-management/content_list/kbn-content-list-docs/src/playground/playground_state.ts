/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// =============================================================================
// Types
// =============================================================================

export type ColumnType = 'name' | 'updatedAt' | 'actions' | 'type' | 'starred' | 'createdBy';

export interface ActiveColumn {
  instanceId: string;
  type: ColumnType;
  props: Record<string, unknown>;
  /** Child actions — only used when `type` is `'actions'`. */
  actions: ActiveAction[];
}

export type ActionType = 'edit' | 'delete' | 'inspect' | 'export';

export interface ActiveAction {
  instanceId: string;
  type: ActionType;
}

export type FilterType = 'sort' | 'tags' | 'starred' | 'createdBy';

export interface ActiveFilter {
  instanceId: string;
  type: FilterType;
}

export interface PlaygroundState {
  provider: {
    entity: string;
    entityPlural: string;
    isReadOnly: boolean;
  };
  features: {
    sorting: boolean;
    pagination: boolean;
    search: boolean;
    starred: boolean;
    tags: boolean;
    userProfiles: boolean;
    initialPageSize: number;
  };
  item: {
    getHref: boolean;
    getEditUrl: boolean;
    onEdit: boolean;
    onDelete: boolean;
    onInspect: boolean;
  };
  table: {
    columns: ActiveColumn[];
    compressed: boolean;
  };
  toolbar: {
    filters: ActiveFilter[];
  };
  data: {
    totalItems: number;
    hasItems: boolean;
    isLoading: boolean;
  };
}

// =============================================================================
// Column definitions registry
// =============================================================================

export interface ColumnDefinition {
  type: ColumnType;
  label: string;
  /** Whether multiple instances are allowed. */
  allowMultiple: boolean;
  defaultProps: Record<string, unknown>;
  configurableProps: PropDefinition[];
}

export interface PropDefinition {
  name: string;
  label: string;
  type: 'boolean' | 'string' | 'select';
  options?: string[];
  defaultValue: unknown;
}

export const COLUMN_DEFINITIONS: ColumnDefinition[] = [
  {
    type: 'name',
    label: 'Column.Name',
    allowMultiple: false,
    defaultProps: { showDescription: true, showTags: false, showStarred: false },
    configurableProps: [
      { name: 'showDescription', label: 'showDescription', type: 'boolean', defaultValue: true },
      { name: 'showTags', label: 'showTags', type: 'boolean', defaultValue: false },
      { name: 'showStarred', label: 'showStarred', type: 'boolean', defaultValue: false },
      { name: 'width', label: 'width', type: 'string', defaultValue: '' },
      { name: 'columnTitle', label: 'columnTitle', type: 'string', defaultValue: '' },
    ],
  },
  {
    type: 'updatedAt',
    label: 'Column.UpdatedAt',
    allowMultiple: false,
    defaultProps: {},
    configurableProps: [
      { name: 'width', label: 'width', type: 'string', defaultValue: '' },
      { name: 'columnTitle', label: 'columnTitle', type: 'string', defaultValue: '' },
    ],
  },
  {
    type: 'type',
    label: 'Column (Type)',
    allowMultiple: false,
    defaultProps: {},
    configurableProps: [
      { name: 'width', label: 'width', type: 'string', defaultValue: '' },
      { name: 'columnTitle', label: 'columnTitle', type: 'string', defaultValue: '' },
    ],
  },
  {
    type: 'starred',
    label: 'Column.Starred',
    allowMultiple: false,
    defaultProps: {},
    configurableProps: [{ name: 'width', label: 'width', type: 'string', defaultValue: '' }],
  },
  {
    type: 'createdBy',
    label: 'Column.CreatedBy',
    allowMultiple: false,
    defaultProps: {},
    configurableProps: [
      { name: 'width', label: 'width', type: 'string', defaultValue: '' },
      { name: 'columnTitle', label: 'columnTitle', type: 'string', defaultValue: '' },
    ],
  },
  {
    type: 'actions',
    label: 'Column.Actions',
    allowMultiple: false,
    defaultProps: {},
    configurableProps: [
      { name: 'width', label: 'width', type: 'string', defaultValue: '' },
      { name: 'columnTitle', label: 'columnTitle', type: 'string', defaultValue: '' },
    ],
  },
];

export const FILTER_DEFINITIONS: { type: FilterType; label: string }[] = [
  { type: 'starred', label: 'Filters.Starred' },
  { type: 'tags', label: 'Filters.Tags' },
  { type: 'createdBy', label: 'Filters.CreatedBy' },
  { type: 'sort', label: 'Filters.Sort' },
];

export const ACTION_DEFINITIONS: { type: ActionType; label: string }[] = [
  { type: 'edit', label: 'Action.Edit' },
  { type: 'inspect', label: 'Action.Inspect' },
  { type: 'delete', label: 'Action.Delete' },
  { type: 'export', label: 'Action (Export)' },
];

// =============================================================================
// Actions
// =============================================================================

type PlaygroundAction =
  | { type: 'ADD_COLUMN'; columnType: ColumnType }
  | { type: 'REMOVE_COLUMN'; instanceId: string }
  | { type: 'REORDER_COLUMNS'; columns: ActiveColumn[] }
  | { type: 'UPDATE_COLUMN_PROPS'; instanceId: string; props: Record<string, unknown> }
  | { type: 'ADD_FILTER'; filterType: FilterType }
  | { type: 'REMOVE_FILTER'; instanceId: string }
  | { type: 'REORDER_FILTERS'; filters: ActiveFilter[] }
  | { type: 'SET_PROVIDER_PROP'; key: keyof PlaygroundState['provider']; value: string | boolean }
  | {
      type: 'SET_FEATURE';
      key: keyof PlaygroundState['features'];
      value: boolean | number;
    }
  | { type: 'SET_DATA_PROP'; key: keyof PlaygroundState['data']; value: boolean | number }
  | { type: 'SET_ITEM_PROP'; key: keyof PlaygroundState['item']; value: boolean }
  | { type: 'ADD_ACTION'; actionType: ActionType }
  | { type: 'REMOVE_ACTION'; instanceId: string }
  | { type: 'REORDER_ACTIONS'; actions: ActiveAction[] };

// =============================================================================
// Helpers
// =============================================================================

let nextId = 0;
const generateId = (prefix: string) => `${prefix}-${++nextId}`;

// =============================================================================
// Initial state
// =============================================================================

export const INITIAL_STATE: PlaygroundState = {
  provider: {
    entity: 'dashboard',
    entityPlural: 'dashboards',
    isReadOnly: false,
  },
  features: {
    sorting: true,
    pagination: true,
    search: true,
    starred: false,
    tags: true,
    userProfiles: true,
    initialPageSize: 10,
  },
  item: {
    getHref: true,
    getEditUrl: false,
    onEdit: false,
    onDelete: false,
    onInspect: false,
  },
  table: {
    columns: [],
    compressed: false,
  },
  toolbar: {
    filters: [],
  },
  data: {
    totalItems: 50,
    hasItems: true,
    isLoading: false,
  },
};

// =============================================================================
// Reducer
// =============================================================================

export const playgroundReducer = (
  state: PlaygroundState,
  action: PlaygroundAction
): PlaygroundState => {
  switch (action.type) {
    case 'ADD_COLUMN': {
      const def = COLUMN_DEFINITIONS.find((d) => d.type === action.columnType);
      if (!def) {
        return state;
      }

      if (!def.allowMultiple && state.table.columns.some((c) => c.type === action.columnType)) {
        return state;
      }

      const newColumn: ActiveColumn = {
        instanceId: generateId(`col-${action.columnType}`),
        type: action.columnType,
        props: { ...def.defaultProps },
        actions: [],
      };

      return {
        ...state,
        table: { ...state.table, columns: [...state.table.columns, newColumn] },
      };
    }

    case 'REMOVE_COLUMN':
      return {
        ...state,
        table: {
          ...state.table,
          columns: state.table.columns.filter((c) => c.instanceId !== action.instanceId),
        },
      };

    case 'REORDER_COLUMNS':
      return { ...state, table: { ...state.table, columns: action.columns } };

    case 'UPDATE_COLUMN_PROPS':
      return {
        ...state,
        table: {
          ...state.table,
          columns: state.table.columns.map((c) =>
            c.instanceId === action.instanceId
              ? { ...c, props: { ...c.props, ...action.props } }
              : c
          ),
        },
      };

    case 'ADD_FILTER': {
      if (state.toolbar.filters.some((f) => f.type === action.filterType)) {
        return state;
      }

      const newFilter: ActiveFilter = {
        instanceId: generateId(`filter-${action.filterType}`),
        type: action.filterType,
      };

      return {
        ...state,
        toolbar: { ...state.toolbar, filters: [...state.toolbar.filters, newFilter] },
      };
    }

    case 'REMOVE_FILTER':
      return {
        ...state,
        toolbar: {
          ...state.toolbar,
          filters: state.toolbar.filters.filter((f) => f.instanceId !== action.instanceId),
        },
      };

    case 'REORDER_FILTERS':
      return { ...state, toolbar: { ...state.toolbar, filters: action.filters } };

    case 'SET_PROVIDER_PROP':
      return { ...state, provider: { ...state.provider, [action.key]: action.value } };

    case 'SET_FEATURE':
      return { ...state, features: { ...state.features, [action.key]: action.value } };

    case 'SET_DATA_PROP':
      return { ...state, data: { ...state.data, [action.key]: action.value } };

    case 'SET_ITEM_PROP':
      return { ...state, item: { ...state.item, [action.key]: action.value } };

    case 'ADD_ACTION': {
      const actionsCol = state.table.columns.find((c) => c.type === 'actions');
      if (actionsCol?.actions.some((a) => a.type === action.actionType)) {
        return state;
      }

      const newAction: ActiveAction = {
        instanceId: generateId(`action-${action.actionType}`),
        type: action.actionType,
      };

      if (actionsCol) {
        return {
          ...state,
          table: {
            ...state.table,
            columns: state.table.columns.map((c) =>
              c.instanceId === actionsCol.instanceId
                ? { ...c, actions: [...c.actions, newAction] }
                : c
            ),
          },
        };
      }

      const actionsDef = COLUMN_DEFINITIONS.find((d) => d.type === 'actions')!;
      const newActionsColumn: ActiveColumn = {
        instanceId: generateId('col-actions'),
        type: 'actions',
        props: { ...actionsDef.defaultProps },
        actions: [newAction],
      };

      return {
        ...state,
        table: {
          ...state.table,
          columns: [...state.table.columns, newActionsColumn],
        },
      };
    }

    case 'REMOVE_ACTION': {
      const col = state.table.columns.find(
        (c) => c.type === 'actions' && c.actions.some((a) => a.instanceId === action.instanceId)
      );
      if (!col) {
        return state;
      }

      const remaining = col.actions.filter((a) => a.instanceId !== action.instanceId);

      return {
        ...state,
        table: {
          ...state.table,
          columns: state.table.columns.map((c) =>
            c.instanceId === col.instanceId ? { ...c, actions: remaining } : c
          ),
        },
      };
    }

    case 'REORDER_ACTIONS': {
      const col = state.table.columns.find((c) => c.type === 'actions');
      if (!col) {
        return state;
      }

      return {
        ...state,
        table: {
          ...state.table,
          columns: state.table.columns.map((c) =>
            c.instanceId === col.instanceId ? { ...c, actions: action.actions } : c
          ),
        },
      };
    }

    default:
      return state;
  }
};

export type { PlaygroundAction };
