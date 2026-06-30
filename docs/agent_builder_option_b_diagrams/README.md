# Option B — Excalidraw Diagrams

Visual diagrams for [agent_builder_option_b_component_diagram.md](../agent_builder_option_b_component_diagram.md).

| # | File | Section |
|---|------|---------|
| 1 | [01_conversation_es_document.excalidraw](./01_conversation_es_document.excalidraw) | Conversation saved object (ES document) |
| 2 | [02_server_components.excalidraw](./02_server_components.excalidraw) | Server-side components |
| 3 | [03_client_components.excalidraw](./03_client_components.excalidraw) | Client-side components |
| 4 | [04_collaborative_message_flow.excalidraw](./04_collaborative_message_flow.excalidraw) | Collaborative message append flow |
| 5 | [05_missing_by_phase.excalidraw](./05_missing_by_phase.excalidraw) | What's missing by phase |

## View / edit

- Open any `.excalidraw` file at [excalidraw.com](https://excalidraw.com) (File → Open).
- Or use the Excalidraw VS Code extension.

## Regenerate

Source checkpoints are in `*.checkpoint.json`. To rebuild after editing a checkpoint:

```bash
node convert_mcp_to_excalidraw.js <name>.checkpoint.json <name>.excalidraw
```

Or run `node generate_all_diagrams.js` after updating checkpoint files.

## Color key

- **Green** — implemented
- **Amber** — in progress (B5.5)
- **Red** — not started
