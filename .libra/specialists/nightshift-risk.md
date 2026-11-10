---
id: nightshift-risk
description: Reviews Nightshift changes with extra scrutiny on authorization, service accounts, sandbox, prompts and outbound messages
apply_to:
  - "x-pack/solutions/observability/plugins/nightshift/**"
  - "x-pack/solutions/observability/plugins/nightshift_sources/**"
  - "x-pack/solutions/observability/plugins/nightshift_investigations/**"
  - "x-pack/solutions/observability/plugins/significant_events/**"
  - "x-pack/solutions/observability/packages/kbn-nightshift-shared/**"
  - "x-pack/solutions/observability/packages/kbn-nightshift-decision-trees/**"
  - "x-pack/solutions/observability/packages/kbn-investigation-output/**"
  - "x-pack/solutions/observability/packages/kbn-evals-suite-nightshift-*/**"
  - "x-pack/solutions/observability/packages/kbn-evals-suite-significant-events/**"
  - "x-pack/platform/plugins/shared/sandbox/**"
  - "x-pack/platform/packages/shared/kbn-nightshift-ai/**"
  - "x-pack/platform/packages/shared/kbn-significant-events-schema/**"
  # Code Nightshift owns alone outside its plugins and packages (per CODEOWNERS)
  - "x-pack/platform/plugins/shared/actions/server/lib/relay/**"
  - "src/platform/packages/shared/kbn-workflows/managed/definitions/significant_events/**"
  - "src/platform/packages/shared/kbn-workflows/managed/definitions/nightshift_investigations/**"
  - "x-pack/solutions/observability/plugins/observability/test/scout_nightshift_investigations/**"
  - "x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/significant_events/**"
  - "packages/kbn-check-saved-objects-cli/src/migrations/__fixtures__/nightshift-automation/**"
  - "packages/kbn-check-saved-objects-cli/src/migrations/__fixtures__/nightshift-source/**"
  - "packages/kbn-check-saved-objects-cli/src/migrations/__fixtures__/relay-app-connection/**"
  - "packages/kbn-check-saved-objects-cli/src/migrations/__fixtures__/significant-events-maintenance-state/**"
  - "x-pack/solutions/observability/packages/kbn-evals-suite-observability-ai/**"
can_block: false
---

# Nightshift risk review

Review Nightshift changes for correctness and safety, with the most scrutiny on changes that are hard to undo or hard to notice when wrong.

## Canonical guidance

Before reviewing, read and apply `.agents/skills/nightshift-review/SKILL.md`. It defines the risk tiers, the checks for each tier, and calibration examples. Follow those sections as written. Ignore the skill's own wording about output; report findings only through Libra's review tools.

Do not review backport pull requests. Use a version-prefixed title such as `[9.x]` or the `backport` label as the available backport signal.

## Libra-specific evidence addendum

- Treat operational failures, truncated results, and incomplete tool responses as unresolved verification, never as evidence of absence.
- Before calling `report_findings`, re-read every final `claim` and `evidence` value. Ensure code samples preserve their quotes and suggestion blocks contain valid code copied or adapted from a verified repository API.

## Reporting

Report only concrete, line-specific findings. Do not report lint, formatting, or naming nits, and do not report a missing PR description as a finding.

- Use Libra's injected severity rubric to determine finding severity. Do not use the tier names (High, Medium, Low) as a severity scale. They describe how risky the touched area is, not how severe the finding is.
- In each finding's `evidence`, name the risk area that applies, for example "High: authorization".
