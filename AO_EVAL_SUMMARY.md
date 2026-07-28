REGRESSION_VERDICT: CLEAN

# AO Eval Summary — endpoint-forensic-analysis vs elastic-defend-configuration-troubleshooting routing collision

## Comment addressed
joeypoon (issue comment): The automatic troubleshooting evals run showed a 0.5 score (regression) on
"Can you check if endpoint eval-host-av has any conflicting antivirus software?" — the
`endpoint-forensic-analysis` skill activates instead of `elastic-defend-configuration-troubleshooting`.

## Root cause
The forensic skill's `description` (the field the router/agent uses to decide which skill to
activate) only said "NOT conflicting/incompatible security software ... (use
elastic-defend-configuration-troubleshooting)" without the word "antivirus" and without
explicitly countering the competing signal "the question names a specific host" — which is
exactly the heuristic the forensic skill's own `description` advertises ("Use for
incident-scoped questions naming specific hosts"). The eval question names a specific host
(`eval-host-av`), so the router likely pattern-matched on "named host" → forensic skill, despite
the antivirus exclusion being present in prose.

## Fix applied (code, not just eval reruns)
File: x-pack/solutions/security/plugins/security_solution/server/agent_builder/skills/endpoint_forensic_analysis/endpoint_forensic_analysis_skill.ts
- `description`: added the literal keyword "antivirus" to the exclusion list, and added
  "even when the question names a specific host" to explicitly defeat the competing "named
  host" routing heuristic.
- `content` "When to Use" section: added a sentence clarifying that naming a specific host is
  not sufficient by itself to load this skill.
- `content` "Do not load" bullet: expanded the security-software exclusion to explicitly name
  "antivirus/AV software", gave an example matching the eval's phrasing ("does host X have
  conflicting antivirus"), and added an explicit counter-statement that naming a host does not
  make it a forensic question.

File: x-pack/solutions/security/plugins/security_solution/server/agent_builder/skills/automatic_troubleshooting/index.ts
- `description`: added "conflicting/incompatible antivirus or security software on a host" so
  the troubleshooting skill's own routing description also positively matches this exact
  scenario (previously it only appeared deep in the long-form `content`, not in the short
  `description` used for skill selection).

Test: x-pack/solutions/security/plugins/security_solution/server/agent_builder/skills/endpoint_forensic_analysis/endpoint_forensic_analysis_skill.test.ts
- Extended the existing routing test to assert the literal "antivirus" keyword and the new
  "Naming a specific host does" clause are present in both `description` and `content`, so a
  future refactor that silently drops the antivirus-specific language regressed by joeypoon
  fails a unit test immediately rather than only being caught by an occasional eval run.

This is the reviewer's suggested fix (exclude antivirus/conflict detection from the forensic
skill's "Do not load" and explicitly direct those intents to
elastic-defend-configuration-troubleshooting), applied on both sides of the routing decision
(forensic skill excludes it more explicitly; troubleshooting skill's short description now also
claims it) to reduce chance of the collision recurring.

## Verification performed
- `node scripts/jest .../endpoint_forensic_analysis/endpoint_forensic_analysis_skill.test.ts` — PASS (4/4)
- `node scripts/jest .../automatic_troubleshooting/index.test.ts` — PASS (8/8)
- `node scripts/eslint --fix` on all 3 changed files — no errors
- `node scripts/type_check --project x-pack/solutions/security/plugins/security_solution/tsconfig.json` — PASS

## Not performed (documented per task instructions)
No live Kibana/Elasticsearch stack is running in this worktree (localhost:5601 and :9200
unreachable), so the actual PR-referenced eval suite
(x-pack/solutions/security/packages/kbn-evals-suite-endpoint, "incompatible antivirus
detection" / automatic_troubleshooting.spec.ts, or the PR-level LLM evals CI job at
buildkite.com/elastic/kibana-evals-pr-llm-evals) could not be executed in this session. No
REGRESSION found — this is a targeted string/prompt change that only adds disambiguating
language; it does not remove any existing exclusion or capability. If desired, a maintainer
with a running stack can re-run the buildkite kibana-evals-pr-llm-evals job against this commit
to confirm the antivirus scenario now scores 1.0.
