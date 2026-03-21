# ⚠️ This Directory is Deprecated

**Do not create new spec documents here.**

## Use OpenSpec Instead

All design work should use the **OpenSpec methodology** for better:
- **Artifact evolution**: Delta specs track changes systematically vs static docs that get stale
- **Task breakdown**: Actionable implementation tasks, not just prose
- **Verification**: Built-in validation that implementation matches design
- **Traceability**: Clear history of design decisions and rationale

### How to Start

Instead of creating a file here, use:

```bash
# For new design work
/openspec-new-change

# Or fast-forward to create all artifacts
/openspec-ff-change

# For exploratory thinking
/openspec-explore
```

Or simply tell Claude about your feature/design and the `openspec-advisor` skill will automatically route you to the appropriate workflow.

### OpenSpec Location

All OpenSpec changes live in:
```
openspec/changes/<change-name>/
├── 1-proposal.md
├── 2-specs.md
├── 3-design.md
└── 4-tasks.md
```

After implementation and merge, changes are archived to:
```
openspec/archive/<change-name>/
```

### Existing Specs in This Directory

Legacy specs remain here for reference but are **not maintained**. For any updates or new work related to these topics, create an OpenSpec change instead.

**Migration status:**
- `2026-03-21-llm-benchmarker-agent-design.md` → Migrating to OpenSpec
- `2026-03-21-rfc-batch-processing-validation-design.md` → Pending migration

### Questions?

See:
- `~/.agents/rules/auto-openspec-complex-tasks.md` for decision criteria
- OpenSpec skills: `/openspec-new-change`, `/openspec-continue-change`, etc.
- Or just ask Claude: "How do I use OpenSpec for design work?"

---

**TL;DR**: Don't write specs here. Use OpenSpec instead. Claude will guide you.
