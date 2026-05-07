# Comment-to-ES|QL

Generates ES|QL code from natural-language comments in the editor using an LLM.

## How it works

1. The user writes a `//` comment on its own line describing what they want
2. Presses **⌘+J** (Mac) / **Ctrl+J** (Windows/Linux)
3. The comment is sent to the `/internal/esql/nl_to_esql` route
4. Generated code appears below the comment highlighted in green
5. The user keeps or undoes the change via buttons or keyboard shortcuts

## License gating

The whole feature is gated behind an **active Enterprise license** via `useNlToEsqlCheck`. When the check fails:

- The editor placeholder falls back to the basic `Start typing ES|QL` text instead of advertising **⌘+J**.
- The ghost-line hints (see below) never appear.
- Pressing **⌘+J** is a no-op — `generateFromComment` returns early.

The check is async; the boolean is mirrored into a ref inside `useGhostLineHint` so listeners registered at editor mount pick up the resolved value once the license observable settles.

## Ghost-line hints

A single hook (`useGhostLineHint`) renders an inline, italic, dimmed hint after a short cursor/typing pause (400 ms). The hint disappears immediately on cursor move, edit, or any state change.

| When the cursor is on… | Hint shown |
| --- | --- |
| an empty line in a non-empty editor | `Type // and press ⌘+J to ask AI to add a step` |
| a `//` line | `Press ⌘+J to generate` |

Implementation notes:

- The text is rendered via a Monaco `afterContentClassName` decoration with a CSS `::after { content: ... }`. This anchors the hint inline at the end of the line content (for comment lines) or at column 1 (for empty lines).
- Suppressed while a review is active (`isReviewActiveRef`) or a generation is in flight (`isGeneratingRef`).
- The empty-editor case is intentionally excluded — the editor's own placeholder covers it.

## Generating indicator

Between **⌘+J** and the LLM response, an inline `Generating...` decoration is shown at the end of the comment line, italic, dimmed, with a soft opacity pulse. Implementation:

- Anchored on the comment line via a tracked Monaco range, so it follows if the user edits content above during the wait.
- The comment hook flips `isGeneratingRef.current = true` and calls `clearGhostHint()` right before showing the indicator. The latter is a forward-ref (`clearGhostHintRef`) that `useGhostLineHint` populates with its own `clearDecoration`, breaking the otherwise-circular dependency between the two hooks.
- Cleared on every exit path: success (just before insertion), abort, error, retrigger, and cleanup.

## Cancellation and retrigger

Pressing **⌘+J** while a request is already in flight or a review is pending tears the previous state down (`cleanup()`):

- The in-flight `AbortController` is aborted, so the HTTP request stops.
- All decorations (anchor, generating, diff) are cleared.
- The review widget is disposed and its keybindings removed.

This means the user can iterate freely — tweak the comment, hit ⌘+J again, no stale UI.

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

## LLM-signaled replacement

The LLM decides whether its output should **replace** the pipe immediately after the comment or be **inserted** alongside it. It signals this via a `REPLACES_NEXT: true/false` flag in its response.

- `REPLACES_NEXT: true` — the generated code is a modified version of the next pipe (e.g., `// Group by host` modifying an existing `| STATS count = COUNT(*)`). On accept, the original pipe is removed.
- `REPLACES_NEXT: false` — the generated code is new and should be inserted without touching existing pipes (e.g., `// filter for delayed flights` adding a new `| WHERE`).

This avoids both problems: no silent deletion of unrelated pipes (like WHERE), and no duplicate pipes left behind when the intent is clearly a modification.

## Review flow

A ViewZone + ContentWidget hybrid renders action buttons between editor lines without overlapping content.

### Insert mode (`REPLACES_NEXT: false`)

- **Generated code**: green background
- **Comment**: no decoration (stays as-is for iteration)
- Buttons: **Undo** (white, grey outline) / **Keep** (soft green pill)

### Replace mode (`REPLACES_NEXT: true`)

- **Generated code**: green background
- **Replaced line**: amber/warning background with strikethrough
- **Comment**: no decoration
- Buttons: **Undo** (white, grey outline) / **Replace** (soft green pill)

Both buttons fill into a stronger color on hover. They sit ~8 px below the inserted code so they don't crowd the line above.

### Actions

- **Keep / Replace** (⌘⇧↵ / Ctrl+Shift+Enter): keeps the generated code. In replace mode, also removes the original pipe. The comment stays in place so the user can iterate — tweak the instruction and press ⌘+J again.
- **Undo** (⌘⇧⌫ / Ctrl+Shift+Backspace): removes the generated code and restores the original state.