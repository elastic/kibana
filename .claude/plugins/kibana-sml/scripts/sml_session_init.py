#!/usr/bin/env python3
"""
SessionStart hook: prints static instructions telling Claude to use
sml_search/sml_read (via MCP) to retrieve relevant context and memories.
"""

print("""## Kibana SML Memory

You have access to two MCP tools for retrieving past context and memories stored in Kibana's Semantic Metadata Layer (SML):

- **platform_core_sml_search** — search for relevant past conversations, workflows, dashboards, and other Kibana assets using natural-language queries. Use this proactively at the start of a task to find related prior work or context.
- **platform_core_sml_read** — fetch the full content of a result when `has_more=true`.

**When to use sml_search:**
- At the start of a new task or question, search for relevant past conversations or context before answering.
- When the user references something that may have been discussed before.
- When background context would improve the quality of your response.

Search with a short natural-language description of the current task. Filter by `type: "conversation"` for past chat history.""")
