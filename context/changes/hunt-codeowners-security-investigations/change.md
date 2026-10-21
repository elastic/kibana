# hunt-codeowners-security-investigations

status: implemented
updated: 2026-10-21

## Summary

Move every Hunt Watch file into hunt-named directories across kbn-workflows and
the alertzero plugin, then consolidate one CODEOWNERS block owned solely by
@elastic/security-investigations so hunt PRs request the right review. Triggered
by PR 297827, which pinged only security-solution and workflows-eng.

## Tracker

- Epic: kibana-15c
- Phases: kibana-15c.1 (kbn-workflows hunt/), kibana-15c.2 (alertzero plugin + common), kibana-15c.3 (CODEOWNERS + PR)
- Related: kibana-5df (Hunt Watch epic), open hunt PRs 297827, 297496, 297846 need a rebase after this lands
- Branch / worktree: `hunt-codeowners-security-investigations` at `~/dev/kibana.worktrees/hunt-codeowners-security-investigations`
- Phase 1 commit: f242bb12d30f
- Phase 2 commit: 28aa3bab5d6d
- Phase 3 commit: d4f48b85f8c0
