# Implementation Tasks

## Phase 1: Shared Helper

- [ ] 1.1 Create `common/response_actions.ts` with `checkOsqueryResponseActionsPermissions` helper

## Phase 2: Tier Tests

- [ ] 2.1 Implement `tiers/security_essentials.spec.ts` (enabled=false)
- [ ] 2.2 Implement `tiers/security_complete.spec.ts` (enabled=false)
- [ ] 2.3 Implement `tiers/endpoint_essentials.spec.ts` (enabled=false)
- [ ] 2.4 Implement `tiers/endpoint_complete.spec.ts` (enabled=true)

## Phase 3: Skipped Tests (large files)

- [ ] 3.1 Implement `ecs_mappings.spec.ts`
- [ ] 3.2 Implement `live_query_packs.spec.ts`
- [ ] 3.3 Implement `packs_integration.spec.ts`
- [ ] 3.4 Implement `saved_queries.spec.ts`
- [ ] 3.5 Implement `add_integration.spec.ts`
- [ ] 3.6 Implement `timelines.spec.ts`

## Phase 4: Partial Gaps

- [ ] 4.1 Implement 3 skipped tests in `alerts_multiple_agents.spec.ts`
- [ ] 4.2 Add "should open lens in new tab" sub-describe to `packs_create_edit.spec.ts`
- [ ] 4.3 Add "should open discover in new tab" sub-describe to `packs_create_edit.spec.ts`

## Phase 5: Tag Gap

- [ ] 5.1 Add `@svlSecurity` to default-space variant in `custom_space.spec.ts`

## Phase 6: Validation

- [ ] 6.1 Run Scout tests locally to verify compilation and non-skipped tests pass
- [ ] 6.2 Commit, push, `/ci`, monitor Buildkite
