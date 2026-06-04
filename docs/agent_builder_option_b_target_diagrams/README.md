# Option B — Target Architecture Excalidraw Diagrams

Visual diagrams for [agent_builder_option_b_target_diagrams.md](../agent_builder_option_b_target_diagrams.md). These depict the **north-star design** (Conversation as Case), independent of current implementation status.

| # | File | Section |
|---|------|---------|
| 1 | [01_product_concept.excalidraw](./01_product_concept.excalidraw) | Product concept: what changes |
| 2 | [02_data_model_before_after.excalidraw](./02_data_model_before_after.excalidraw) | Conversation data model — before and after |
| — | [02_ecosystem.excalidraw](./02_ecosystem.excalidraw) | Ecosystem: Conversation between Cases and AB (supplementary) |
| 3 | [03_data_model.excalidraw](./03_data_model.excalidraw) | Conversation data model (target) |
| 4 | [04_activity_feed.excalidraw](./04_activity_feed.excalidraw) | Activity feed — unified timeline |
| 5 | [05_ux_layout.excalidraw](./05_ux_layout.excalidraw) | Conversation detail UX layout |
| 6 | [06_access_control.excalidraw](./06_access_control.excalidraw) | Access control layers |
| 7 | [07_threads.excalidraw](./07_threads.excalidraw) | Threads — parallel workstreams |
| 8 | [08_phased_delivery.excalidraw](./08_phased_delivery.excalidraw) | Phased delivery — capability roadmap |
| 9 | [09_itsm_at_a_glance.excalidraw](./09_itsm_at_a_glance.excalidraw) | ITSM at a glance (B6) |

## View / edit

- Open any `.excalidraw` file at [excalidraw.com](https://excalidraw.com) (File → Open).
- Or use the Excalidraw VS Code extension.

## Regenerate

Source checkpoints are in `*.checkpoint.json`. To rebuild after editing a checkpoint:

```bash
node convert_mcp_to_excalidraw.js <name>.checkpoint.json <name>.excalidraw
```

## Related

Implementation-status diagrams (current POC) live in [../agent_builder_option_b_diagrams/](../agent_builder_option_b_diagrams/).
