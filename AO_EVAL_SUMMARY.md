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
(`eval-host-av`), so the router likely pattern-matched on "named host" -> forensic skill, despite
the antivirus exclusion being present in prose.

## Fix status
This fix was already applied on this branch (commit 21f3f79ebf2c, "[AO] address review feedback
on #275840") and remains present on disk in this session — verified by reading the current source,
not by re-applying it:

File: x-pack/solutions/security/plugins/security_solution/server/agent_builder/skills/endpoint_forensic_analysis/endpoint_forensic_analysis_skill.ts
- `description`: includes the literal keyword "antivirus" in the exclusion list, plus "even when
  the question names a specific host" to explicitly defeat the competing "named host" routing
  heuristic.
- `content` "When to Use" section: clarifies that naming a specific host is not sufficient by
  itself to load this skill.
- `content` "Do not load" bullet: expands the security-software exclusion to explicitly name
  "antivirus/AV software", gives an example matching the eval's phrasing ("does host X have
  conflicting antivirus"), and states explicitly that naming a host does not make it a forensic
  question.

File: x-pack/solutions/security/plugins/security_solution/server/agent_builder/skills/automatic_troubleshooting/index.ts
- `description`: includes "conflicting/incompatible antivirus or security software on a host" so
  the troubleshooting skill's own routing description also positively matches this exact
  scenario (this text previously only appeared deep in the long-form `content`, not in the short
  `description` used for skill selection).

Test: x-pack/solutions/security/plugins/security_solution/server/agent_builder/skills/endpoint_forensic_analysis/endpoint_forensic_analysis_skill.test.ts
- Asserts the literal "antivirus" keyword and the "Naming a specific host does" clause are
  present in both `description` and `content`, so a future refactor that silently drops the
  antivirus-specific language regresses via a failing unit test immediately rather than only
  being caught by an occasional eval run.

This matches the reviewer's suggested fix (exclude antivirus/conflict detection from the
forensic skill's "Do not load" and explicitly direct those intents to
elastic-defend-configuration-troubleshooting), applied on both sides of the routing decision to
reduce chance of the collision recurring.

## Verification performed (this session)
- `node scripts/jest .../endpoint_forensic_analysis/endpoint_forensic_analysis_skill.test.ts` — PASS (4/4)
- `node scripts/jest .../automatic_troubleshooting/index.test.ts` — PASS (8/8)
- Read and confirmed both `description` fields and the "Do not load" content section contain the
  antivirus-specific disambiguation language described above.

## Not performed (documented per task instructions)
No live Kibana/Elasticsearch stack reachable on localhost:9200 / localhost:5601 in this worktree
during this session, so the actual PR-referenced eval suite
(x-pack/solutions/security/packages/kbn-evals-suite-endpoint/evals/automatic_troubleshooting/automatic_troubleshooting.spec.ts,
"incompatible antivirus detection" test, which seeds `eval-host-av` and asks the exact reviewer
question) could not be executed live in this session. No regression found in the static analysis
of the routing description/content; the fix only adds disambiguating language and does not remove
any existing exclusion or capability. A maintainer with a running stateful stack can re-run
`node scripts/scout run-tests --arch stateful --domain classic --config x-pack/solutions/security/packages/kbn-evals-suite-endpoint/playwright.config.ts --testFiles x-pack/solutions/security/packages/kbn-evals-suite-endpoint/evals/automatic_troubleshooting/automatic_troubleshooting.spec.ts --workers 1`
(or the buildkite kibana-evals-pr-llm-evals job) to confirm the antivirus scenario now scores 1.0.

## Other unresolved comments
- raqueltabuyo ("All good Patryk! Great work!"): praise, no-op — noted in AO_REVIEW_REPLY.md.
- patrykkopycinski ("@elasticmachine merge upstream"): bot/CI command, no-op for this agent —
  noted in AO_REVIEW_REPLY.md.
