# Deferred remote investigation scoring

This draft preserves the remote scoring and evaluation adapters extracted from Kibana PR #291603 for Task 2 of deductive-ai/deductive#10565. It is not required by either core runner PR.

- Source: `165c4f468741a59f58a2ddd8e76b4df818f57592` (remote eval implementation), preserved at complete snapshot `nightshift/archive-291603-c1e2c2e7` (`c1e2c2e793baeffd7db8da8725adf02b39621b26`).
- Review base: `aa7b96a75e7aad5c1c89423c8f7b56b41b026c88`, the parent of the original remote layer. The base includes the historical full harness and micro-evals; those are historical dependencies, not a proposed new merge order.
- Contents: remote dataset loader/tests, optional case-ID schema, investigation constraints and task suffix adapter, the 23-score remote spec, selection wiring, and the historical reproduction/scoring documentation.
- Historical validation: original PR #291603 records two native runs plus suite/auth/manifest unit and type checks. That evidence applies to the original combined branch, not independent execution of this extraction.
- Remaining work: select actual graders incrementally, adapt to the current trace-only task and shared dataset loader from #291002, use the deferred grader branch as appropriate, keep remote connectivity supplied by revised #291603, and re-run tests and acceptance. Do not restore the historical micro-evals dependency.
- Related published grader source: `nightshift/deferred-investigation-graders`; independent micro-evals remain on existing PR #291009 / `nightshift/micro-evals`.
- Product transport retries from source commit `c1e2c2e793b` target the removed Nightshift-owned gRPC manager. The entire implementation stays recoverable in the snapshot. Revised #291603 uses the shared sandbox session contract and fixes only current workspace manifest completion bookkeeping; the old retry mechanism is obsolete and is not copied here.
- Existing API-key header handling on the current base supersedes the old header-flattening/auth-mode additions. Those remain in the complete snapshot for historical inspection.

No endpoints, credentials, or private examples are included. This branch is preservation for future prioritization, not a production-ready scoring implementation.
