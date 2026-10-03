# ES|QL Composer Consolidation: One-Pager

**Date**: 2025-11-05  
**Status**: Ready for Platform Team Review  
**Decision Required**: Yes (Implementation Approval)

---

## The Situation

**Two packages** build ES|QL queries in Kibana:

| | @kbn/esql-composer | @kbn/esql-ast composer |
|---|---|---|
| **Production Files** | 17-19 ✅ | 0 ❌ |
| **Created By** | Observability | Platform |
| **Commands** | 9 | All ES\|QL |
| **Status** | Active, proven | Unused |

---

## The Problem

- **Duplication**: Two solutions, one goal
- **Confusion**: Teams don't know which to use
- **Fragmentation**: Can't deprecate either without pain
- **Technical Debt**: Both need maintenance

---

## Why @kbn/esql-composer Won

```typescript
// Simple, functional, elegant
from('logs-*')
  .pipe(
    ...dynamicFilters,              // ✅ Spreading works
    condition ? where('x') : (q) => q,  // ✅ Clean conditionals
    stats('avg = AVG(??field)', { field })  // ✅ Simple syntax
  )
```

**Key strengths**:
1. ✅ Simple functional API
2. ✅ Natural array spreading
3. ✅ Clean conditional patterns
4. ✅ Reusable operators
5. ✅ Low learning curve

---

## Why @kbn/esql-ast Should Win

1. ✅ **Complete**: All ES|QL commands, not just 9
2. ✅ **Powerful**: Full AST access and manipulation
3. ✅ **Platform**: Official, maintained, future-proof
4. ✅ **Ecosystem**: Parser, walker, mutate, builder integrated
5. ✅ **Advanced**: SET commands, parameter inlining, validation

**But**: Missing the ergonomics that made esql-composer successful.

---

## The Solution

### Step 1: Enhance @kbn/esql-ast (3-4 weeks)

Add functional helpers that enable the same patterns:

```typescript
// Add to @kbn/esql-ast
export const where = (condition: string, params?: object) => ...;
export const stats = (aggregation: string, params?: object) => ...;
export type QueryOperator = (query: ComposerQuery) => ComposerQuery;

// Enable this:
esql.from('logs-*')
  .pipe(
    ...filters,              // ✅ Spreading now works!
    condition ? where('x') : identity,  // ✅ Clean conditionals!
    stats('avg = AVG(??field)', { field })  // ✅ Same syntax!
  )
```

**Effort**: 3-4 weeks, 1 engineer  
**Risk**: Low (additive, no breaking changes)

---

### Step 2: Migrate Production Files (6-8 weeks)

Migrate 17-19 files from `@kbn/esql-composer` to `@kbn/esql-ast`:

**Changes per file**:
```diff
- import { from, where } from '@kbn/esql-composer';
+ import { esql, where } from '@kbn/esql-ast';

- from('logs-*')
+ esql.from('logs-*')

- .toString()
+ .print()
```

**That's it!** Logic stays identical.

**Effort**: 6-8 weeks, 2 engineers (phased approach)  
**Risk**: Medium (mitigated by testing and rollback plans)

---

### Step 3: Deprecate @kbn/esql-composer (1 week)

- Add linter rule preventing new usage
- Mark package as deprecated
- Archive once migration complete

**Effort**: 1 week, 1 engineer  
**Risk**: Low

---

## Timeline

| Phase | Duration | Resources | Deliverable |
|-------|----------|-----------|-------------|
| **Enhancement** | 3-4 weeks | 1 engineer | Functional helpers in @kbn/esql-ast |
| **Pilot** | 1 week | 1 engineer | 2-3 files migrated successfully |
| **Migration** | 6-8 weeks | 2 engineers | All 17-19 files migrated |
| **Deprecation** | 1 week | 1 engineer | Package deprecated |
| **Total** | **11-14 weeks** | **~3 engineer-months** | One unified solution |

---

## Cost-Benefit

### Costs
- **Time**: 3 engineer-months
- **Risk**: Some migration risk (mitigated)
- **Coordination**: Cross-team effort

### Benefits
- ✅ Single source of truth
- ✅ Reduced maintenance burden
- ✅ No developer confusion
- ✅ Platform-supported solution
- ✅ Full ES|QL support for all teams
- ✅ Future-proof architecture

**ROI**: Positive within 6 months (maintenance savings)

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking changes | Low | High | Make enhancements additive only |
| Migration errors | Medium | Medium | Phased approach + extensive testing |
| Performance regression | Low | Medium | Benchmark helpers |
| Team resistance | Low | Low | Minimal code changes required |
| **Overall Risk** | **Low-Medium** | - | Well-mitigated |

---

## Success Metrics

### Phase 1 (Enhancement)
- [ ] Functional helpers implemented
- [ ] Tests pass with >90% coverage
- [ ] Documentation complete
- [ ] Platform team approval

### Phase 2 (Migration)
- [ ] All 17-19 files migrated
- [ ] Query output matches
- [ ] All tests passing
- [ ] No production incidents

### Phase 3 (Completion)
- [ ] @kbn/esql-composer deprecated
- [ ] Zero new usage
- [ ] Package archived

---

## Decision Required

**Platform Team**: Approve enhancement proposal?

**Options**:
1. ✅ **Approve**: Proceed with enhancement and migration plan
2. ⏸️ **Defer**: Need more information (specify what)
3. ❌ **Reject**: Alternative approach (propose alternative)

---

## Next Steps (if Approved)

### Week 1-2
- [ ] Platform engineer assigned
- [ ] Enhancement proposal reviewed in detail
- [ ] Implementation kickoff

### Week 3-6
- [ ] Functional helpers implemented
- [ ] Tests written
- [ ] Documentation updated
- [ ] Code review and merge

### Week 7-8
- [ ] Pilot migration (2-3 files)
- [ ] Verify approach works
- [ ] Adjust if needed

### Week 9-16
- [ ] Full migration rollout
- [ ] Monitor for issues
- [ ] Team support

### Week 17+
- [ ] Deprecation
- [ ] Archive package
- [ ] Done! 🎉

---

## Documents Available

📄 **For Review**:
1. `ESQL_COMPOSER_ENHANCEMENT_PROPOSAL.md` - Full technical spec (850 lines)
2. `ESQL_COMPOSER_MIGRATION_GUIDE.md` - Step-by-step instructions (950 lines)
3. `ESQL_COMPOSER_MIGRATION_EXAMPLE.md` - Real-world example (425 lines)

📊 **For Context**:
4. `ESQL_COMPOSER_USAGE_COMPARISON.md` - Current state analysis (518 lines)
5. `ESQL_COMPOSER_COMPARISON.md` - Deep technical comparison (1,200 lines)
6. `ESQL_COMPOSER_CODE_EXAMPLES.md` - Real production code (900 lines)

📋 **For Reference**:
7. `ESQL_COMPOSER_ANALYSIS_README.md` - Complete index (updated)
8. `ESQL_COMPOSER_EXECUTIVE_SUMMARY.md` - Executive view (350 lines)

**Total**: 50,000 words, 5,793 lines of analysis and planning

---

## Recommendation

**Proceed with enhancement and migration.**

**Rationale**:
1. ✅ Platform solution is superior long-term
2. ✅ Migration is straightforward (mostly import changes)
3. ✅ Risk is manageable with phased approach
4. ✅ Maintenance savings justify investment
5. ✅ Teams get full ES|QL capabilities

**Best path forward**: Enhance → Migrate → Consolidate

---

## Questions?

- **Technical**: See `ESQL_COMPOSER_ENHANCEMENT_PROPOSAL.md`
- **Process**: See `ESQL_COMPOSER_MIGRATION_GUIDE.md`
- **Examples**: See `ESQL_COMPOSER_MIGRATION_EXAMPLE.md`
- **Slack**: #kibana-esql
- **Owner**: [To Be Assigned]

---

**Ready to proceed?** Let's consolidate! 🚀

---

**One-Pager Version**: 1.0  
**Last Updated**: 2025-11-05  
**Decision Deadline**: [To Be Set]

