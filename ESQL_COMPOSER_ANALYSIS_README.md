# ES|QL Composer Analysis: Documentation Index

This directory contains a comprehensive analysis comparing `@kbn/esql-composer` (Observability team) with `@kbn/esql-ast` composer (Platform team).

---

## 📊 Quick Stats

| Metric | @kbn/esql-composer | @kbn/esql-ast composer |
|--------|-------------------|----------------------|
| **Production Files** | ✅ **17 files** | ❌ **0 files** |
| **Command Support** | 9 commands | ✅ All ES\|QL commands |
| **Created By** | Observability | Platform |
| **Status** | Active, proven | New, unused |
| **Complexity** | ~500 lines | ~1,500 lines |

---

## 📚 Documents

### 0. 📋 **One-Pager** (Quick Decision Brief) 🆕
**File**: `ESQL_COMPOSER_ONE_PAGER.md`

**Read this for**:
- Quick executive briefing
- Decision approval
- Timeline at a glance
- Cost-benefit summary

**Contents**:
- Situation summary
- Solution overview (3 steps)
- Timeline and resources
- Risk assessment
- Success metrics
- Clear decision request

**Time to read**: 5 minutes

---

### 1. 📄 **Executive Summary** (For Decision Makers)
**File**: `ESQL_COMPOSER_EXECUTIVE_SUMMARY.md`

**Read this first if you're**:
- Platform team lead
- Tech lead making consolidation decisions
- Manager assessing migration effort

**Contents**:
- High-level comparison
- Clear recommendation
- Migration phases and timeline
- Risk assessment
- Success metrics

**Time to read**: 10 minutes

---

### 2. 📊 **Usage Comparison** (Current State Analysis) 🆕
**File**: `ESQL_COMPOSER_USAGE_COMPARISON.md`

**Read this to understand**:
- Current production usage (17-19 files vs 0)
- Where @kbn/esql-composer is used and why
- Real-world patterns in APM, metrics, traces
- Why @kbn/esql-ast hasn't been adopted
- Feature matrix comparison
- Migration challenges

**Contents**:
- Production file breakdown by feature area
- Real code patterns from actual files
- Architectural comparison with code
- Success factors analysis
- Detailed recommendations

**Time to read**: 25 minutes

---

### 3. 📖 **Detailed Comparison** (For Deep Understanding)
**File**: `ESQL_COMPOSER_COMPARISON.md`

**Read this if you need**:
- Complete feature analysis
- Architecture deep-dive
- Real usage patterns
- Technical strengths/weaknesses
- Migration strategy details

**Contents**:
- Comprehensive feature table (15+ features)
- Usage analysis across codebase
- API design comparison
- Migration considerations
- Specific improvement recommendations

**Time to read**: 30-45 minutes

---

### 4. 🔧 **Enhancement Proposal** (For Platform Team) 🆕
**File**: `ESQL_COMPOSER_ENHANCEMENT_PROPOSAL.md`

**Read this to**:
- Understand what to add to @kbn/esql-ast
- See proposed functional helpers API
- Review implementation plan
- Assess effort and timeline

**Contents**:
- Problem statement and rationale
- Proposed API design (with code)
- Implementation plan (4 phases)
- Testing strategy
- Success metrics
- Timeline (3-4 weeks)

**Time to read**: 40 minutes

---

### 5. 📋 **Quick Reference** (For Migration Work)
**File**: `ESQL_COMPOSER_QUICK_REFERENCE.md`

**Read this when**:
- Starting migration work
- Need API equivalence
- Looking for patterns
- Writing migration guide

**Contents**:
- Side-by-side API comparison tables
- Migration examples (before/after)
- Common pattern translations
- API equivalence mapping
- Rollout plan

**Time to read**: 20 minutes

---

### 6. 📘 **Migration Guide** (Step-by-Step Instructions) 🆕
**File**: `ESQL_COMPOSER_MIGRATION_GUIDE.md`

**Read this when**:
- Actually performing migration
- Need detailed before/after examples
- Want testing strategies
- Need troubleshooting help

**Contents**:
- Quick migration checklist
- 5 detailed migration examples
- Pattern-by-pattern guide
- Common issues and solutions
- Testing strategies
- Codemod script
- Rollback plan

**Time to read**: 45 minutes

---

### 7. 💻 **Code Examples** (For Implementation)
**File**: `ESQL_COMPOSER_CODE_EXAMPLES.md`

**Read this to**:
- See real production code
- Understand complex patterns
- Learn migration techniques
- Compare implementations

**Contents**:
- 6 detailed code examples
- Real APM and metrics grid code
- Side-by-side comparisons
- Testing patterns
- Performance considerations

**Time to read**: 30-40 minutes

---

### 8. 🎯 **Migration Example: APM Filters** (Concrete Case Study) 🆕
**File**: `ESQL_COMPOSER_MIGRATION_EXAMPLE.md`

**Read this to**:
- See a complete real-world migration
- Understand step-by-step process
- Learn testing approach
- Build confidence for your migration

**Contents**:
- Full before/after of APM filters.ts
- Diff view showing exact changes
- Migration of dependent files
- Testing strategy with commands
- Time estimates per task
- Verification checklist

**Time to read**: 20 minutes

---

## 🎯 Recommendation Summary

### The Problem
Two query builders exist for the same purpose, splitting effort and confusing developers.

### The Solution
**Consolidate to @kbn/esql-ast composer** — it's more powerful and platform-supported.

### The Catch
@kbn/esql-ast is less ergonomic than @kbn/esql-composer for common patterns.

### The Fix
**Add functional helpers to @kbn/esql-ast first**, then migrate:

```typescript
// These helpers make migration easy:
export const where = (body: string, params?: Record<string, unknown>) => ...;
export const stats = (body: string, params?: Record<string, unknown>) => ...;
export type QueryOperator = (query: ComposerQuery) => ComposerQuery;

// Then migration is natural:
// Before:
from('logs-*').pipe(where('x == ?y', { y }), limit(10))

// After (same style!):
esql.from('logs-*').pipe(where('x == ?y', { y }), limit(10))
```

---

## 📈 Migration Timeline

| Phase | Duration | Effort | Risk |
|-------|----------|--------|------|
| **Feature Parity** | 2 weeks | 1 engineer | Low |
| **Pilot Migration** | 1 week | 1 engineer | Low |
| **Full Migration** | 6-8 weeks | 2 engineers | Medium |
| **Deprecation** | 1 week | 1 engineer | Low |
| **Total** | **10-11 weeks** | **~3 engineer-months** | **Medium** |

---

## 🎪 Key Findings

### Why @kbn/esql-composer Is Popular

1. **Simple Functional API**
   ```typescript
   from('logs-*')
     .pipe(
       where('x == ?y', { y }),
       limit(10)
     )
   ```
   
2. **Spreading Works Naturally**
   ```typescript
   const filters = [where('x'), where('y')];
   query.pipe(...filters)
   ```

3. **Clean Conditionals**
   ```typescript
   .pipe(
     condition ? where('x') : (q) => q
   )
   ```

4. **Reusable Operators**
   ```typescript
   const timeFilter = where('@timestamp >= NOW() - 1h');
   // Use in multiple queries
   ```

### Why @kbn/esql-ast Is Better Long-Term

1. **Full ES|QL Support** - All commands, not just 9
2. **Rich Ecosystem** - Parser, walker, mutate, builder all integrated
3. **Advanced Features** - SET commands, parameter inlining, AST manipulation
4. **Platform Solution** - Official, maintained, future-proof
5. **Better Debugging** - Tree view, multiple formats, AST access

---

## 🔧 What Needs to Happen

### Phase 1: Add to @kbn/esql-ast (Required Before Migration)

```typescript
// 1. Functional command builders
export const where = (body: string, params?: Record<string, unknown>) => {
  // Return command compatible with .pipe()
};

// 2. QueryOperator type support  
export type QueryOperator = (query: ComposerQuery) => ComposerQuery;

// 3. Conditional helper
ComposerQuery.prototype.pipeIf = function(condition, operator) {
  return condition ? this.pipe(operator) : this;
};
```

### Phase 2: Migrate File-by-File

1. Start with simple files (3-4 files)
2. Verify query output matches exactly
3. Update tests
4. Deploy and monitor
5. Repeat for remaining files (13-14 files)

### Phase 3: Deprecate @kbn/esql-composer

1. Add linter rule preventing new usage
2. Mark package as deprecated
3. Archive once all migrations complete

---

## 📊 Production Usage Analysis

### Files Using @kbn/esql-composer (17 total)

**High Complexity** (Hardest to migrate):
1. `kbn-unified-metrics-grid/src/common/utils/esql/create_esql_query.ts` - 122 lines
2. `kbn-unified-metrics-grid/src/components/trace_metrics_grid/trace_charts_definition.ts`

**Medium Complexity** (Moderate effort):
3. `apm/public/components/shared/links/discover_links/filters.ts` - Reusable operators
4. `apm/public/components/shared/links/discover_links/filters.test.ts`
5. `unified_doc_viewer/public/.../create_trace_context_where_clause.ts`
6. `unified_doc_viewer/public/.../create_trace_context_where_clause.test.ts`

**Low Complexity** (Easy to migrate):
- 11 more files with simple usage

### Files Using @kbn/esql-ast composer (0 total)

- ❌ No production usage yet
- Only test files and internal examples

**Conclusion**: @kbn/esql-composer is proven and trusted; @kbn/esql-ast needs adoption.

---

## 🚀 Success Criteria

### For Feature Parity Phase
- [ ] Functional helpers added to @kbn/esql-ast
- [ ] QueryOperator pattern works with spreading
- [ ] Conditional commands as clean as esql-composer
- [ ] Migration guide written and reviewed
- [ ] Platform team approves approach

### For Migration Phase  
- [ ] All 17 production files migrated
- [ ] Query output matches exactly (or better)
- [ ] All tests passing
- [ ] No production incidents
- [ ] Team trained on new API

### For Completion
- [ ] @kbn/esql-composer deprecated
- [ ] Linter prevents new usage
- [ ] Package archived
- [ ] Documentation updated

---

## 💡 Key Insights

### 1. Don't Just Migrate
**Enhance @kbn/esql-ast first** to match @kbn/esql-composer's ergonomics.

### 2. Preserve What Works
The functional operator pattern is excellent—keep it!

### 3. Gain New Capabilities
After migration, teams get full ES|QL support + advanced features.

### 4. Phased Approach
Start with easy files, build confidence, tackle hard ones last.

### 5. Long-term Win
Platform solution better for future Kibana development.

---

## 📞 Next Steps

### For Platform Team
1. ✅ Review **Executive Summary** for decision context
2. ✅ Read **Enhancement Proposal** for technical approach
3. ✅ Assign owner for functional helpers implementation
4. ✅ Review and approve proposed API design
5. ✅ Schedule implementation kickoff (3-4 weeks)

### For Migration Owner
1. ✅ Read **Usage Comparison** to understand current state
2. ✅ Study **Enhancement Proposal** for implementation details
3. ✅ Implement functional helpers in @kbn/esql-ast
4. ✅ Follow **Migration Guide** for process
5. ✅ Use **APM Migration Example** as template
6. ✅ Pilot with 2-3 simple files first

### For Developers (During Migration)
1. ✅ Follow **Migration Guide** step-by-step
2. ✅ Reference **Quick Reference** for API mapping
3. ✅ Use **Code Examples** as implementation templates
4. ✅ Review **APM Migration Example** for real-world pattern
5. ✅ Test thoroughly with provided strategies
6. ✅ Ask questions early in #kibana-esql

---

## 📁 Document Details

| Document | Words | Lines | Focus |
|----------|-------|-------|-------|
| **One-Pager** 🆕 | 1,500 | 250 | **Quick decision** |
| Executive Summary | 2,500 | 350 | Decision making |
| Usage Comparison 🆕 | 6,000 | 518 | Current state |
| Detailed Comparison | 10,000 | 1,200 | Deep analysis |
| Enhancement Proposal 🆕 | 8,000 | 850 | Implementation |
| Quick Reference | 5,000 | 600 | Migration work |
| Migration Guide 🆕 | 7,000 | 950 | Step-by-step |
| Code Examples | 8,000 | 900 | Implementation |
| APM Migration Example 🆕 | 3,500 | 425 | Case study |
| **Total** | **51,500** | **6,043** | **Complete view** |

---

## 🏆 Best Practices from Both Solutions

### From @kbn/esql-composer
- ✅ Functional operator pattern
- ✅ Clean conditional syntax
- ✅ Spreading arrays naturally
- ✅ Reusable query builders
- ✅ Simple parameter syntax

### From @kbn/esql-ast
- ✅ Full ES|QL command support
- ✅ Rich AST ecosystem
- ✅ Parameter inlining
- ✅ Multiple output formats
- ✅ Advanced debugging

### Combined in Future Solution
- ✅ Best of both worlds
- ✅ Functional style + platform power
- ✅ Easy migration path
- ✅ Future-proof architecture

---

## ❓ FAQ

### Q: Why not keep both packages?
**A**: Maintenance burden, developer confusion, fragmented ecosystem. One solution is better.

### Q: Can we auto-migrate with codemods?
**A**: Partially. Simple cases yes, complex patterns need manual review.

### Q: What about breaking changes?
**A**: Minimize by adding helpers first. Most code should look similar.

### Q: How long will migration take?
**A**: 10-11 weeks total with 2-3 engineers (conservative estimate).

### Q: What's the risk?
**A**: Medium. Mitigated by phased approach, testing, and maintaining both packages during transition.

### Q: Who should own this?
**A**: Platform team owns helpers, observability helps with migration.

---

## 📝 Change Log

- **2025-11-05**: Complete analysis and implementation plan
  - ✅ Analyzed 17 production files
  - ✅ Compared both implementations in detail
  - ✅ Created 8 comprehensive documents (50,000 words)
  - ✅ Developed migration strategy with timelines
  - ✅ Created **Enhancement Proposal** with API design
  - ✅ Wrote **Migration Guide** with step-by-step instructions
  - ✅ Documented **Real Migration Example** (APM filters)
  - ✅ Analyzed **Current Usage Patterns** across codebase

---

## 🤝 Credits

**Analysis by**: AI Assistant  
**Based on**:
- 17 production files using @kbn/esql-composer
- @kbn/esql-ast package source code
- Real-world usage patterns
- Kibana codebase analysis

**Stakeholders**:
- Observability team (@kbn/esql-composer creators)
- Platform team (@kbn/esql-ast maintainers)
- APM team (heavy users)
- Unified metrics team (complex users)

---

## 📚 Additional Resources

- [ES|QL Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/esql.html)
- [@kbn/esql-ast Package](./src/platform/packages/shared/kbn-esql-ast)
- [@kbn/esql-composer Package](./src/platform/packages/shared/kbn-esql-composer)

---

**Ready to start?** Begin with the Executive Summary, then dive into the document that matches your role and needs.

**Questions?** Review the FAQ or reach out to the platform team.

**Let's consolidate!** 🚀

