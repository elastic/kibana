## 1. Canonical Spec Foundations

- [x] 1.1 Define `skill.requirements.yaml` schema and validation rules
- [x] 1.2 Add canonical skill directory scaffold under `skills/<skill-id>/`
- [x] 1.3 Implement scenario parsing with stable identifiers

## 2. Target Generators

- [x] 2.1 Implement sandbox generator (scripts + cursor-plugin-evals outputs)
- [x] 2.2 Implement Kibana generator (Agent Builder artifacts + kbn/evals outputs)
- [x] 2.3 Enforce native constraint validation per target

## 3. Eval Parity Adapters

- [x] 3.1 Define shared expectations model and map to cursor-plugin-evals
- [x] 3.2 Map shared expectations to kbn/evals with scenario ID propagation
- [x] 3.3 Support target-specific eval extensions without dropping baselines

## 4. Governance and CI

- [x] 4.1 Add CODEOWNERS validation for canonical skill `owners`
- [x] 4.2 Add generator `--check` parity validation for sandbox repo
- [x] 4.3 Add generator `--check` parity validation for Kibana repo
- [x] 4.4 Implement user-skill export with `parity: required|optional`

## 5. Pilot and Rollout

- [x] 5.1 Select a pilot skill and migrate to canonical spec
- [x] 5.2 Wire generated outputs into sandbox and Kibana repos
- [x] 5.3 Run evals in both frameworks and document parity results
