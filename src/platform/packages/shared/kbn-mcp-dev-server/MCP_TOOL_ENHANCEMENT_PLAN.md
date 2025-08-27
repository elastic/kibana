# MCP Tool Enhancement Plan: `code_search` and Beyond

This document outlines a phased plan to enhance the capabilities of the `code_search` tool and introduce new, related tools to create a comprehensive code exploration and analysis platform for the Gemini agent.

## Phase 1: Foundational Improvements

These changes address the most immediate limitations of the existing `code_search` tool and provide the highest impact for the lowest effort.

| Priority | Feature | Description & Reasoning |
| :--- | :--- | :--- |
| 1 (High) | **Pagination & Result Size** | **Need:** The current hard limit of 20 results is a significant bottleneck for gathering comprehensive context. **Implementation:** Add optional `size` (e.g., default 20, max 100) and `page`/`offset` parameters to the `code_search` tool to allow the agent to retrieve a complete set of results. |
| 2 (High) | **Make `query` Optional** | **Need:** Using `query: "*"` to run KQL-only searches is a non-intuitive hack. **Implementation:** Update the tool's input schema to make the `query` parameter optional. If it's omitted, the tool should execute a search using only the `kql` filter. This makes the tool's interface cleaner and more idiomatic. |
| 3 (High) | **New Tool: `get_distinct_values`** | **Need:** The agent currently has to guess which values are valid for KQL fields like `kind`, `language`, and `type`. **Implementation:** Create a new, lightweight tool (`get_distinct_values`) that takes a field name as input and returns all unique values for that field from the Elasticsearch index using a terms aggregation. This removes trial-and-error and improves filter construction. |

## Phase 2: Advanced Code Intelligence Tools

With the foundational improvements in place, we can build higher-level tools that provide deeper insights into the codebase.

| Priority | Feature | Description & Reasoning |
| :--- | :--- | :--- |
| 4 (High) | **New Tool: `find_usages`** | **Need:** A core requirement for code intelligence is tracing dependencies. The agent needs to find where a specific function or class is being used. **Implementation:** Create a `find_usages` tool that takes a symbol's file path as input. It would perform a `code_search` with a KQL filter on the `imports` field (e.g., `imports: *my_target_file*`) to find all files that import and therefore potentially use the symbol. |
| 5 (Medium) | **New Tool: `find_similar_code`** | **Need:** To help with refactoring and pattern discovery, the agent could benefit from finding semantically similar code snippets. **Implementation:** Create a `find_similar_code` tool that accepts a string of code. It would use the ELSER model to generate an embedding for the snippet and then use an Elasticsearch `knn` (k-Nearest Neighbor) query to find the most similar code chunks in the index. |

## Implementation Roadmap

1.  **Sprint 1 (Phase 1):**
    *   [ ] Implement pagination (`size`, `page`) in `code_search`.
    *   [ ] Refactor `code_search` to make the `query` parameter optional.
    *   [ ] Create and register the new `get_distinct_values` tool.
2.  **Sprint 2 (Phase 2):**
    *   [ ] Design and implement the `find_usages` tool.
    *   [ ] Investigate and implement the `find_similar_code` tool.
