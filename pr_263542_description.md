Fixes [security-team#16838](https://github.com/elastic/security-team/issues/16838).

This fixes two resolution scoring gaps when resolution groups include members without alerts.

## Summary

- Phase 2 now merges modifiers from every entity that resolves to a target, not just members discovered from alert documents. This ensures silent members still contribute watchlists and criticality to the resolved score.
- Phase 1 lookup sync now writes target self-rows for confirmed targets, so the group is still discovered and scored when only the canonical target has alerts.

## Why this matters

Before this change, two incorrect behaviors were possible:

- A silent alias could be part of the same resolution group but its watchlists and criticality would be ignored.
- A resolution group could fail to produce a resolved score row when alerts existed only on the canonical target.

## Test coverage

- Added focused unit coverage for resolution lookup sync and resolution-group modifier merging.
- Added an API integration regression test that verifies a canonical target still gets a resolved score when only the canonical target has alerts.
- Added an API integration regression test that verifies silent group members still contribute watchlists and highest criticality to the resolved output.

## Manual validation

Manual reproduction tooling lives in [elastic/security-documents-generator#366](https://github.com/elastic/security-documents-generator/pull/366), which adds a deterministic `risk-score-v2 --scenario issue-16838` preset specifically for this bug.

Run from the SDG repo:

```bash
yarn start risk-score-v2 --scenario issue-16838 --space issue-16838 --dangerous-clean --no-follow-on
```

Expected behavior on `main`:

- `group-a-target` shows `watchlists=1` and `criticality=-`, even though a silent resolved member has an additional watchlist and `high_impact` criticality.
- `group-b-target-with-alerts` does not receive a resolved score when only the canonical target has alerts.

Expected behavior on this branch:

- `group-a-target` shows `watchlists=2` and `criticality=high_impact`.
- `group-b-target-with-alerts` receives a resolved score.

## Manual test steps

1. Start from Kibana `main` with the SDG branch from [elastic/security-documents-generator#366](https://github.com/elastic/security-documents-generator/pull/366).
2. Run the scenario command above against a local stack.
3. Confirm the broken behavior on `main`:
   - `group-a-target` only reflects one watchlist and no criticality.
   - `group-b-target-with-alerts` has no resolved score.
4. Switch back to this Kibana branch and restart Kibana.
5. Re-run the same SDG scenario command.
6. Confirm the fixed behavior:
   - `group-a-target` reflects both watchlists and `high_impact` criticality.
   - `group-b-target-with-alerts` now has a resolved score.