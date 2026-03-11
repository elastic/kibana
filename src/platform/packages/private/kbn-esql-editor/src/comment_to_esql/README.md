# Comment-to-ES|QL

Generates ES|QL code from natural-language comments in the editor using an LLM.

## How it works

1. The user writes a `//` comment on its own line describing what they want
2. Presses **⌘+J** (Mac) / **Ctrl+J** (Windows/Linux)
3. The comment is sent to the `/internal/esql/nl_to_esql` route
4. Generated code appears below the comment with an inline diff review (comment in red, generated code in green)
5. The user accepts or rejects the change via buttons or keyboard shortcuts

## Surgical vs non-surgical mode

### Non-surgical

When the editor contains **only** a comment (no existing ES|QL code), the entire editor content is replaced with the generated query. The LLM receives the comment as a free-form instruction and produces a complete ES|QL query from scratch.

Example — editor contains:

```
// Show the top 10 destinations by flight count
```

Result: the full generated query replaces the comment entirely.

### Surgical

When the editor already contains ES|QL code alongside the comment, the system operates in **surgical** mode:

- Only the comment line is sent as the instruction; the full query is sent as context
- The target comment is marked with `>>>` / `<<<` delimiters so the LLM knows which comment to act on (other comments are treated as documentation)
- The LLM generates only the pipe(s) that should replace the comment, not the full query
- The generated code is inserted on a new line below the comment

Example — editor contains:

```
FROM kibana_sample_data_flights
// Filter for delayed flights
| STATS avg_delay = AVG(FlightDelayMin) BY Dest
```

The LLM receives:

```
FROM kibana_sample_data_flights
>>> // Filter for delayed flights <<<
| STATS avg_delay = AVG(FlightDelayMin) BY Dest
```

And outputs only: `| WHERE FlightDelay == true`

## Insert-only behavior

Generated code is always **inserted** on a new line below the comment. The system never automatically replaces existing lines — this avoids unintended deletion of valid code (e.g., replacing an existing `| WHERE` clause when the user intended to add a second filter). If the LLM generates a modified version of an existing pipe (e.g., an extended `| STATS`), the user can manually remove the original line after accepting.

## Review flow

When generated code is shown:

- **Comment line**: red background with strikethrough (to be removed on accept)
- **Generated code**: green background (to be kept on accept)
- **Accept** (⌘⇧↵ / Ctrl+Shift+Enter): removes the comment, keeps the generated code
- **Reject** (⌘⇧⌫ / Ctrl+Shift+Backspace): removes the generated code, restores the original state