# Autocomplete v2

The grammar-driven autocomplete engine, built next to the current flow in `../autocomplete`. Both
export a `suggest` with the same signature. The package exports one of them from
`../index.ts`, so switching flows is one line.

The engine knows no command. A command gets its suggestions from the grammar position of the
cursor and from the command signatures in `../../esql_js_sim`. Rules, enforced by
`boundary.test.ts`:

- No import from a command's folder under `commands/registry/`.
- No command name and no grammar rule name of a command (`whereCommand`) as a string.
- A provider override is the only exception. It is keyed by an argument, never by a command,
  it is listed in `overrides.ts`, and the list may grow only with an owner and an issue.
