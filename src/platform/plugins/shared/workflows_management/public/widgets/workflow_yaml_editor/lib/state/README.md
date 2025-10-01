# Workflow Editor State Management

This directory contains the Redux state management for the workflow YAML editor, split into focused, maintainable modules.

## File Structure

```
state/
├── index.ts                    # Main exports - use this for imports
├── types.ts                    # TypeScript type definitions
├── slice.ts                    # Redux slice with reducers
├── middleware.ts               # Debounced computation middleware
├── selectors.ts                # State selectors
├── store.ts                    # Store configuration
└── utils/
    ├── build_workflow_lookup.ts  # Workflow lookup table construction
    ├── computation.ts            # YAML parsing and graph computation logic
    └── step_finder.ts            # Utility for finding steps by line number
```

## Usage

Always import from the main `index.ts` file:

```typescript
import { 
  workflowEditorStore, 
  setYamlString, 
  selectWorkflowGraph,
  type RootState,
  type WorkflowLookup,
  type StepInfo
} from './state';
```

## Module Responsibilities

### `types.ts`
- **Purpose**: Central type definitions
- **Contains**: `WorkflowEditorState`, `RootState`, `AppDispatch`, `WorkflowEditorStore`
- **Dependencies**: `utils/build_workflow_lookup.ts` for `WorkflowLookup` type

### `slice.ts`
- **Purpose**: Redux slice with all reducers
- **Contains**: Action creators, reducers, initial state
- **Key Actions**: `setYamlString`, `setCursorPosition`, `clearComputedData`
- **Dependencies**: `types.ts`, `utils/step_finder.ts`, `utils/build_workflow_lookup.ts`

### `middleware.ts`
- **Purpose**: Debounced computation middleware
- **Contains**: Middleware that triggers computation on YAML changes
- **Features**: 500ms debounce, immediate computation for empty state
- **Dependencies**: `slice.ts`, `utils/computation.ts`, `types.ts`

### `selectors.ts`
- **Purpose**: State selection functions
- **Contains**: All selectors for accessing state slices
- **Key Selectors**: `selectYamlString`, `selectWorkflowGraph`, `selectFocusedStepInfo`
- **Dependencies**: `types.ts`

### `store.ts`
- **Purpose**: Redux store configuration
- **Contains**: Store factory, default store instance
- **Features**: Configured serialization settings, middleware setup
- **Dependencies**: `slice.ts`, `middleware.ts`

### `utils/build_workflow_lookup.ts`
- **Purpose**: Workflow lookup table construction
- **Contains**: `WorkflowLookup` and `StepInfo` types, `buildWorkflowLookup` function
- **Features**: YAML document parsing, step extraction with line positions
- **Dependencies**: YAML library

### `utils/computation.ts`
- **Purpose**: Heavy computation logic
- **Contains**: YAML parsing, workflow graph creation, error handling
- **Features**: Async-safe computation, proper error boundaries
- **Dependencies**: External YAML/workflow libraries, `slice.ts`, `utils/build_workflow_lookup.ts`

### `utils/step_finder.ts`
- **Purpose**: Step location utilities
- **Contains**: Logic for finding steps by line number
- **Features**: Efficient step lookup by line ranges
- **Dependencies**: `utils/build_workflow_lookup.ts`

## Benefits of This Structure

### 🎯 **Single Responsibility**
Each file has one clear purpose and is easy to understand.

### 🧪 **Testability**
Individual modules can be tested in isolation.

### 🔄 **Maintainability**
Changes to computation logic don't affect selectors, etc.

### 📦 **Tree Shaking**
Unused utilities won't be bundled.

### 🔍 **Discoverability**
Clear file names make it easy to find relevant code.

### ⚡ **Performance**
Heavy computation logic is isolated and can be optimized independently.

## Migration from Old Structure

The old monolithic `state.ts` file has been split while maintaining the same public API. All existing imports should continue to work:

```typescript
// This still works exactly the same
import { workflowEditorStore, setYamlString, type WorkflowLookup } from './state';
```

## Development Guidelines

1. **Keep `index.ts` clean** - Only re-exports, no logic
2. **Use TypeScript strictly** - All modules should be fully typed
3. **Test each module** - Write unit tests for utilities and selectors
4. **Document complex logic** - Especially in `utils/computation.ts` and `utils/build_workflow_lookup.ts`
5. **Follow dependency direction** - Higher-level modules import from lower-level ones

## Adding New Features

1. **New action**: Add to `slice.ts`
2. **New selector**: Add to `selectors.ts`  
3. **New computation**: Add to `utils/computation.ts`
4. **New workflow parsing**: Add to `utils/build_workflow_lookup.ts`
5. **New middleware**: Create new file or extend `middleware.ts`
6. **New types**: Add to `types.ts` or `utils/build_workflow_lookup.ts`
7. **Export**: Add to `index.ts`