REGRESSION_VERDICT: CLEAN

# AO Eval Summary — endpoint-forensic-analysis vs elastic-defend-configuration-troubleshooting routing collision

## Comment addressed
joeypoon (issue comment): The automatic-troubleshooting evals run showed a 0.5 score
(regression) on "Can you check if endpoint eval-host-av has any conflicting antivirus
software?" — the `endpoint-forensic-analysis` skill activates instead of
`elastic-defend-configuration-troubleshooting`. Suggested fix: exclude conflicting/
incompatible antivirus software, policy/configuration failures, endpoint health/
missed check-ins, performance/resource troubleshooting, and output/integration
failures from the forensic skill's "Do not load" section, and explicitly direct
those intents to elastic-defend-configuration-troubleshooting.

## Root cause
`endpoint-forensic-analysis`'s `description` field (the short text used for skill
selection/routing) excluded "conflicting/incompatible security software" but never
used the literal word "antivirus", and did not explicitly counter the competing
"the question names a specific host" signal that the forensic skill's own
description advertises as its activation trigger. The eval question names a specific
host (`eval-host-av`), so the router matched the forensic skill's "named host" signal
over the narrower antivirus exclusion buried in the prose.

## Fix verified on disk (this session)
File: x-pack/solutions/security/plugins/security_solution/server/agent_builder/skills/endpoint_forensic_analysis/endpoint_forensic_analysis_skill.ts
- `description` (line ~29-31): "NOT conflicting/incompatible antivirus or security
  software, policy or configuration failures, endpoint health or missed check-ins,
  performance/resource troubleshooting, or output/integration failures — even when
  the question names a specific host (use elastic-defend-configuration-troubleshooting)."
- `content` "When to Use" (line 42): "Naming a specific host is not sufficient on
  its own — the question must also require forensic reconstruction ... not
  configuration/health/software-conflict diagnosis."
- `content` "Do not load" bullets (lines 48-52): explicitly list antivirus/AV
  software, policy/configuration failures, endpoint health/missed check-ins,
  performance/resource troubleshooting, and output/integration failures, each
  routed to elastic-defend-configuration-troubleshooting — matching the reviewer's
  suggested fix verbatim in substance.

File: x-pack/solutions/security/plugins/security_solution/server/agent_builder/skills/automatic_troubleshooting/index.ts
- `description` (line 204): positively matches "conflicting/incompatible antivirus
  or security software on a host" so the troubleshooting skill's own routing
  description also claims this scenario (this text previously only existed deep in
  the long-form `content`, not in the short `description` used for skill selection).

Test: x-pack/solutions/security/plugins/security_solution/server/agent_builder/skills/endpoint_forensic_analysis/endpoint_forensic_analysis_skill.test.ts
- Asserts the literal "antivirus" keyword and the "Naming a specific host does"
  clause are present in both `description` and `content`, so a future refactor that
  silently drops this disambiguation fails a fast unit test.

This work was completed in an earlier AO cycle on this branch (commit 21f3f79ebf2c)
and confirmed still present and correct in this session by direct source read (not
re-applied).

## Verification performed (this session)
- `node scripts/jest .../endpoint_forensic_analysis/endpoint_forensic_analysis_skill.test.ts` — PASS (4/4)
- `node scripts/jest .../automatic_troubleshooting/index.test.ts` — PASS (8/8)
- Read and confirmed both `description` fields and the "Do not load" content section
  contain the antivirus-specific disambiguation language described above.
- `description` field length confirmed at 895 chars (schema max 1024) — no
  truncation risk from the added disambiguation text.

## Not performed (documented per task instructions)
No live Kibana/Elasticsearch stack reachable on localhost:9200 / localhost:5601 in
this worktree during this session, so the actual PR-referenced eval suite
(x-pack/solutions/security/packages/kbn-evals-suite-endpoint/evals/automatic_troubleshooting/automatic_troubleshooting.spec.ts,
"incompatible antivirus detection" case, which seeds `eval-host-av` and asks the
exact reviewer question) could not be executed live in this session. No regression
found in static analysis of the routing description/content; the fix only adds
disambiguating language and does not remove any existing exclusion or capability.
A maintainer with a running stateful stack can re-run:
`node scripts/scout run-tests --arch stateful --domain classic --config x-pack/solutions/security/packages/kbn-evals-suite-endpoint/playwright.config.ts --testFiles x-pack/solutions/security/packages/kbn-evals-suite-endpoint/evals/automatic_troubleshooting/automatic_troubleshooting.spec.ts --workers 1`
(or the buildkite kibana-evals-pr-llm-evals job) to confirm the antivirus scenario
now scores 1.0.

## Other unresolved comments
- raqueltabuyo ("All good Patryk! Great work!"): praise, no-op — see AO_REVIEW_REPLY.md.
- patrykkopycinski (x2, "@elasticmachine merge upstream"): bot/CI command directed at
  elasticmachine, no code action required from this agent — see AO_REVIEW_REPLY.md.
