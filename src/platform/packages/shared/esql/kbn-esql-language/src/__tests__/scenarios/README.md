# Autocomplete scenarios

A scenario is one row of data: a query, a cursor position and the suggestions expected there.
Scenarios are grouped in one table per command, next to the command
(`commands/registry/<command>/autocomplete.scenarios.ts`).

Every scenario goes through `suggest()`, the function the editor calls, with callbacks that
answer from a scenario world. A table never calls a command's own autocomplete, so it describes
what the user sees and does not depend on how the suggestions are produced.

```ts
export const limitScenarios: ScenarioTable = {
  command: 'limit',
  scenarios: [
    {
      group: 'LIMIT <number>',
      name: 'suggests BY and pipe after number',
      query: 'from a | limit 4 ', // text before the cursor
      after: ' | keep a', // optional text after the cursor
      expect: { exact: ['BY ', '| ', '\n'] },
    },
  ],
};
```

- `expect.exact`: the suggestions are exactly these, in any order.
- `expect.contains` and `expect.excludes`: partial checks.
- `world`: overrides of the default world (columns, sources, policies, license and so on). Each
  row runs with its own world: the package's column cache does not carry over between rows.
- `status: 'new'`: a deliberate behaviour change. The row is skipped on flows that do not
  have it.

`describeScenarios(table)` declares one test per row and per flow in `SUGGEST_FLOWS`. While
two autocomplete flows exist, both are listed there and every row has to pass on both.

## Parity with the new flow

`parity.test.ts` runs every table through the grammar-driven flow (`language/autocomplete_v2`)
and counts the rows that already match. No row fails that test: the counts are kept in a
snapshot, so a change that moves them, up or down, shows in its diff. Update the snapshot with
`node scripts/jest <path to parity.test.ts> -u`.

Read the counts with care early on: a row that expects nothing, or only that some items are
absent, matches a flow that offers little.
