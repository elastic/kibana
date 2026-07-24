# Exploratory Tester Session Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend exploratory-tester measurement to report scoped token totals and separate browser/tool/artifact byte metrics without changing the existing token output or browser behavior.

**Architecture:** Extract the current transcript parser into a reusable standard-library module. Keep `session-token-usage.py` as a compatibility CLI for the existing one-line output, and add an opt-in JSON mode driven by an explicit, sanitized metrics manifest and an allowlisted session-directory scan. Update Phase 3 and the report template to consume the JSON metrics as bookkeeping only.

**Tech Stack:** Python 3 standard library (`argparse`, `dataclasses`, `json`, `math`, `pathlib`, `tempfile`, `unittest`), Markdown phase/template instructions, existing Kibana pre-commit checks.

## Global Constraints

- Preserve the legacy output exactly: `input=N output=N cache_create=N cache_read=N total=N`.
- Keep missing or unsupported measurements explicitly unavailable; never convert unavailable data into zero.
- Do not intercept or change Playwright MCP/browser calls.
- Do not persist request or response bodies.
- Do not estimate tokens from byte counts.
- Do not change the five-step exploration checklist, reproduction gates, severity rules, or evidence requirements.
- Metrics must not suppress, merge, reclassify, or downgrade findings.
- Only allowlisted session artifact kinds and sanitized numeric payload counters may be measured.
- Keep the shared script behavior used by `test-plan-generator` backward-compatible.

---

## File map

- `x-pack/solutions/security/plugins/security_solution/.agents/scripts/session_metrics.py` — reusable transcript, manifest, artifact, and JSON metrics implementation.
- `x-pack/solutions/security/plugins/security_solution/.agents/scripts/session-token-usage.py` — compatibility wrapper and CLI entry point.
- `x-pack/solutions/security/plugins/security_solution/.agents/scripts/test_session_metrics.py` — unit and CLI contract tests using temporary fixture files.
- `x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/phases/3-report.md` — instructions for invoking structured metrics and rendering unavailable states.
- `x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/templates/report-format.md` — separate token, payload-byte, and artifact-byte report fields.

### Task 1: Extract the parser while preserving the legacy contract

**Files:**
- Create: `x-pack/solutions/security/plugins/security_solution/.agents/scripts/session_metrics.py`
- Modify: `x-pack/solutions/security/plugins/security_solution/.agents/scripts/session-token-usage.py`
- Test: `x-pack/solutions/security/plugins/security_solution/.agents/scripts/test_session_metrics.py`

**Interfaces:**
- `TokenTotals(input_tokens: int, output_tokens: int, cache_creation_input_tokens: int, cache_read_input_tokens: int)` — immutable token totals with addition and legacy total calculation.
- `TranscriptResult(source: str, scope: str, status: str, totals: TokenTotals | None, usage_blocks: int)` — one transcript’s result, where status is `available`, `missing`, `unreadable`, or `empty`.
- `parse_transcript(path: Path, scope: str = "orchestrator") -> TranscriptResult`.
- `format_legacy_usage(totals: TokenTotals) -> str`.
- `resolve_transcript(explicit_path: str | None) -> Path | None`.

- [ ] **Step 1: Write failing parser and compatibility tests.**

Add tests with temporary JSONL files:

```python
def test_parse_transcript_supports_message_and_top_level_usage(self):
    with tempfile.TemporaryDirectory() as raw_dir:
        transcript = Path(raw_dir) / "session.jsonl"
        transcript.write_text(
            '{"message":{"usage":{"input_tokens":2,"output_tokens":3,'
            '"cache_creation_input_tokens":5,"cache_read_input_tokens":7}}}\n'
            '{"usage":{"input_tokens":11,"output_tokens":13,'
            '"cache_creation_input_tokens":17,"cache_read_input_tokens":19}}\n',
            encoding="utf-8",
        )

        result = parse_transcript(transcript)

        self.assertEqual(result.status, "available")
        self.assertEqual(result.totals, TokenTotals(13, 16, 22, 26))
        self.assertEqual(
            format_legacy_usage(result.totals),
            "input=13 output=16 cache_create=22 cache_read=26 total=77",
        )
```

Also cover malformed lines, an empty transcript, a missing transcript, negative/non-finite values, and automatic versus explicit transcript resolution.

- [ ] **Step 2: Run the focused tests and verify the expected red failure.**

Run:

```bash
python3 -m unittest \
  x-pack/solutions/security/plugins/security_solution/.agents/scripts/test_session_metrics.py \
  -v
```

Expected: collection fails because `session_metrics` and its parser interfaces do not exist yet.

- [ ] **Step 3: Implement the minimal pure parser.**

Move the current transcript-shape handling into `session_metrics.py`. Validate every usage value as a finite, non-negative integer-valued number before adding it. Unknown records and malformed JSONL lines remain ignorable, while a file with no valid usage blocks becomes `empty`.

Change `session-token-usage.py` to import the module, resolve the one legacy transcript path, exit `1` for missing/unreadable/empty input, and print only:

```python
print(format_legacy_usage(result.totals))
```

Do not add structured output to the default invocation.

- [ ] **Step 4: Run the focused tests and verify green.**

Run the same `python3 -m unittest ... -v` command. Expected: all parser and compatibility tests pass, including the exact legacy output assertion.

- [ ] **Step 5: Commit the parser extraction.**

```bash
git add \
  x-pack/solutions/security/plugins/security_solution/.agents/scripts/session_metrics.py \
  x-pack/solutions/security/plugins/security_solution/.agents/scripts/session-token-usage.py \
  x-pack/solutions/security/plugins/security_solution/.agents/scripts/test_session_metrics.py
git commit -m "refactor(exploratory-tester): extract session metrics parser"
```

### Task 2: Add scoped manifest and byte metrics

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/.agents/scripts/session_metrics.py`
- Modify: `x-pack/solutions/security/plugins/security_solution/.agents/scripts/test_session_metrics.py`

**Interfaces:**
- `ManifestTranscript(path: str, scope: str = "orchestrator", name: str | None = None)`.
- `ManifestArtifact(path: str, kind: str)`.
- `load_manifest(path: Path) -> dict[str, object]`.
- `build_session_metrics(manifest_path: Path | None, explicit_transcript: Path | None, session_dir: Path | None) -> dict[str, object]`.
- `render_json_metrics(metrics: Mapping[str, object]) -> str`.

- [ ] **Step 1: Write failing scoped and byte-metric tests.**

Add tests for a manifest shaped as follows:

```json
{
  "version": 1,
  "session_root": ".",
  "transcripts": [
    {"path": "orchestrator.jsonl", "scope": "orchestrator"},
    {"path": "worker-1.jsonl", "scope": "worker", "name": "flow-1"}
  ],
  "artifacts": [
    {"path": "findings-flow-1.md", "kind": "findings"},
    {"path": "screenshots/step.png", "kind": "screenshot"},
    {"path": "detectors.js", "kind": "detector_source"}
  ],
  "payload_bytes": {
    "tool_input": 101,
    "tool_output": 202,
    "browser_events": 303
  }
}
```

Assert that JSON metrics include:

```python
self.assertEqual(metrics["schema_version"], 1)
self.assertEqual(metrics["tokens"]["by_scope"]["worker"]["output_tokens"], 13)
self.assertEqual(metrics["artifacts"]["by_kind"]["screenshot"]["bytes"], 4)
self.assertEqual(
    metrics["payload_bytes"],
    {
        "status": "available",
        "tool_input": 101,
        "tool_output": 202,
        "browser_events": 303,
    },
)
```

Also assert that missing payload counters produce `{"status": "not_available"}` and that a manifest path escaping `session_root` is rejected without reading the escaped file.

- [ ] **Step 2: Run the new tests and verify the expected red failure.**

Run:

```bash
python3 -m unittest \
  x-pack/solutions/security/plugins/security_solution/.agents/scripts/test_session_metrics.py \
  -v
```

Expected: the new manifest and metrics assertions fail because structured metrics are not implemented.

- [ ] **Step 3: Implement the manifest and artifact model.**

In `session_metrics.py`:

1. Resolve manifest-relative paths against `session_root`, reject paths outside that root, and accept only `orchestrator` or `worker` scopes.
2. Parse all listed transcripts into per-source results and aggregate only `available` results by scope and globally. Preserve unavailable source records in `sources`.
3. Measure only explicit artifact entries plus known files under an optional `session_dir`: findings Markdown, `report.md`, configuration JSON, screenshot image extensions, video extensions, and detector-source files. Do not recursively scan arbitrary files.
4. Validate payload counters as finite, non-negative integers and return `not_available` when the manifest omits them.
5. Emit deterministic JSON with sorted keys and this shape:

```json
{
  "schema_version": 1,
  "tokens": {
    "status": "available",
    "by_scope": {},
    "aggregate": {}
  },
  "payload_bytes": {
    "status": "available",
    "tool_input": 0,
    "tool_output": 0,
    "browser_events": 0
  },
  "artifacts": {
    "status": "available",
    "by_kind": {}
  },
  "sources": []
}
```

If no usable transcript exists, set token status to `not_available`; do not emit zero-valued token usage as a successful measurement. If artifact scanning has no inputs, set artifact status to `not_available`.

- [ ] **Step 4: Run all focused tests and verify green.**

Run:

```bash
python3 -m unittest \
  x-pack/solutions/security/plugins/security_solution/.agents/scripts/test_session_metrics.py \
  -v
```

Expected: parser, scoped aggregation, path-safety, artifact, payload, and unavailable-state tests pass.

- [ ] **Step 5: Commit scoped metrics.**

```bash
git add \
  x-pack/solutions/security/plugins/security_solution/.agents/scripts/session_metrics.py \
  x-pack/solutions/security/plugins/security_solution/.agents/scripts/test_session_metrics.py
git commit -m "feat(exploratory-tester): add scoped session metrics"
```

### Task 3: Add the opt-in JSON CLI while preserving shared consumers

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/.agents/scripts/session-token-usage.py`
- Modify: `x-pack/solutions/security/plugins/security_solution/.agents/scripts/test_session_metrics.py`

**Interfaces:**
- `--json` — emits the versioned structured document.
- `--manifest PATH` — reads the sanitized scoped transcript/artifact/payload manifest.
- `--session-dir PATH` — measures allowlisted session outputs without arbitrary directory traversal.
- Legacy positional `TRANSCRIPT_PATH` remains supported.

- [ ] **Step 1: Write failing subprocess contract tests.**

Use `subprocess.run` against the real script and assert:

```python
def run_script(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(SCRIPT), *args],
        capture_output=True,
        text=True,
        check=False,
    )


def test_json_mode_is_opt_in(self):
    with tempfile.TemporaryDirectory() as raw_dir:
        tmp_path = Path(raw_dir)
        transcript = tmp_path / "session.jsonl"
        transcript.write_text(
            '{"message":{"usage":{"input_tokens":2,"output_tokens":3,'
            '"cache_creation_input_tokens":5,"cache_read_input_tokens":7}}}\n',
            encoding="utf-8",
        )

        result = run_script(str(transcript))
        self.assertEqual(result.returncode, 0)
        self.assertEqual(
            result.stdout,
            "input=2 output=3 cache_create=5 cache_read=7 total=17\n",
        )

        structured = run_script(
            str(transcript),
            "--json",
            "--manifest",
            str(tmp_path / "metrics.json"),
        )
        self.assertEqual(structured.returncode, 0)
        self.assertEqual(json.loads(structured.stdout)["schema_version"], 1)
```

Test that structured mode returns valid JSON with `not_available` statuses for a missing transcript/manifest input, while legacy mode retains its non-zero fallback behavior.

- [ ] **Step 2: Run the subprocess tests and verify the expected red failure.**

Run the focused unittest command and confirm the JSON-mode assertions fail while the legacy parser tests continue to identify the compatibility contract.

- [ ] **Step 3: Implement `argparse` dispatch.**

Keep the default path equivalent to the current command. In JSON mode, parse the optional manifest/session directory, print `render_json_metrics(...)`, and exit `0` when a valid JSON measurement document was produced, even when its status fields say `not_available`. Exit non-zero only for invalid command-line arguments or malformed manifests.

- [ ] **Step 4: Run the CLI contract tests and a manual fixture invocation.**

Run:

```bash
python3 -m unittest \
  x-pack/solutions/security/plugins/security_solution/.agents/scripts/test_session_metrics.py \
  -v
python3 x-pack/solutions/security/plugins/security_solution/.agents/scripts/session-token-usage.py \
  --json --session-dir x-pack/solutions/security/plugins/security_solution/.agents/scripts
```

Expected: the first command passes all tests and the second emits one valid JSON object with no log text mixed into stdout.

- [ ] **Step 5: Commit the CLI contract.**

```bash
git add \
  x-pack/solutions/security/plugins/security_solution/.agents/scripts/session-token-usage.py \
  x-pack/solutions/security/plugins/security_solution/.agents/scripts/test_session_metrics.py
git commit -m "feat(exploratory-tester): expose structured session metrics"
```

### Task 4: Integrate metrics into the exploratory-tester report contract

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/phases/3-report.md`
- Modify: `x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/templates/report-format.md`
- Modify: `x-pack/solutions/security/plugins/security_solution/.agents/scripts/test_session_metrics.py`

**Interfaces:**
- Phase 3 invokes `session-token-usage.py --json --session-dir "$SESSION_DIR"` and adds `--manifest "$SESSION_DIR/metrics-manifest.json"` only when that file exists.
- The report has separate `Token usage`, `Browser/tool payload bytes`, and `Session artifact bytes` lines.

- [ ] **Step 1: Write a report-contract test before changing Markdown.**

Add a test that reads the two Markdown files and asserts the presence of the exact labels:

```python
self.assertIn("**Token usage:**", report_template)
self.assertIn("**Browser/tool payload bytes:**", report_template)
self.assertIn("**Session artifact bytes:**", report_template)
self.assertIn("not available", report_template)
self.assertIn("Level 1 findings are never suppressed", phase_three)
```

The last assertion protects the existing quality invariant while the bookkeeping section changes.

- [ ] **Step 2: Run the report-contract test and verify it fails on the missing fields.**

Run the focused unittest command. Expected: the new payload/artifact assertions fail against the current Markdown.

- [ ] **Step 3: Update Phase 3 and the report template.**

In Step 3a, instruct the agent to run structured metrics after the session directory is known, preserve the legacy token line, and render explicit unavailable states. Add the two separate byte lines to `## Timing & Cost` immediately after token usage. Document that:

- Token values are raw model counts.
- Payload and artifact values are bytes, not tokens.
- Tool payload values are `not available` until a sanitized collector manifest supplies them.
- Metrics never affect finding classification or suppression.

- [ ] **Step 4: Run the report-contract and full focused tests.**

Run:

```bash
python3 -m unittest \
  x-pack/solutions/security/plugins/security_solution/.agents/scripts/test_session_metrics.py \
  -v
```

Expected: all parser/CLI/report-contract tests pass, and the existing Level 1 suppression language remains present.

- [ ] **Step 5: Commit report integration.**

```bash
git add \
  x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/phases/3-report.md \
  x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/templates/report-format.md \
  x-pack/solutions/security/plugins/security_solution/.agents/scripts/test_session_metrics.py
git commit -m "docs(exploratory-tester): report separate session metrics"
```

### Task 5: Final validation and handoff

**Files:**
- Verify all files changed by Tasks 1–4; do not stage unrelated files from the original `main` checkout.

- [ ] **Step 1: Run Python syntax and focused tests.**

```bash
python3 -m py_compile \
  x-pack/solutions/security/plugins/security_solution/.agents/scripts/session_metrics.py \
  x-pack/solutions/security/plugins/security_solution/.agents/scripts/session-token-usage.py \
  x-pack/solutions/security/plugins/security_solution/.agents/scripts/test_session_metrics.py
python3 -m unittest \
  x-pack/solutions/security/plugins/security_solution/.agents/scripts/test_session_metrics.py \
  -v
```

Expected: compilation succeeds and every focused test passes.

- [ ] **Step 2: Run changed-file diagnostics and repository checks.**

Run the IDE linter diagnostics for the changed files, then:

```bash
node scripts/check.js --scope=local
```

Fix any diagnostics introduced by the branch. Do not change unrelated files or weaken quality/security assertions to make checks pass.

- [ ] **Step 3: Review the final diff and branch state.**

```bash
git status --short --branch
git diff --check
git diff main...HEAD --stat
git diff main...HEAD -- \
  docs/superpowers/specs/2026-07-24-exploratory-tester-session-metrics-design.md \
  docs/superpowers/plans/2026-07-24-exploratory-tester-session-metrics.md \
  x-pack/solutions/security/plugins/security_solution/.agents/scripts \
  x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/phases/3-report.md \
  x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/templates/report-format.md
```

Expected: only the design, plan, measurement implementation/tests, and report-contract files are included.

- [ ] **Step 4: Create the draft PR.**

Push `agent/exploratory-tester-metrics` and open a draft PR against `main` referencing #18592 with `Addresses #18592`. Include the focused test command, `node scripts/check.js --scope=local`, and any unavailable live-payload limitation in the PR body.
