# TableListView - Development History

> [!IMPORTANT]  
> These documents were written and revised in a long-running conversation with **Claude 4.5 Sonnet**, in **Cursor**.  Since they're meant to serve
> as a starting point for the Agent-driven implmentation phase, they should be considered ~80% accurate and certainly subject to change.

**Date**: November 15, 2025  
**Total Commits**: 82+ | **Bugs Fixed**: 13 | **Enhancements**: 28+ | **Open Issues**: 1

---

## Critical Bugs Fixed

### Data Integrity
- **[#241381](https://github.com/elastic/kibana/pull/241381)** Dashboard references lost when updating from listing page (backported to 9.2)
- **[#109345](https://github.com/elastic/kibana/pull/109345)** Empty view trapped users with no creation action

### State Management  
- **[#132930](https://github.com/elastic/kibana/pull/132930)** Pagination state not properly maintained
- **[#162034](https://github.com/elastic/kibana/pull/162034)** Search reset regression (backported to 8.9)
- **[#160871](https://github.com/elastic/kibana/pull/160871)** Tag selection broken with initialFilter prop
- **[#147841](https://github.com/elastic/kibana/pull/147841)** URL state broke without Router context

### Performance & UX
- **[#194009](https://github.com/elastic/kibana/pull/194009)** Characters dropped when typing fast in search field
- **[#161570](https://github.com/elastic/kibana/pull/161570)** Dark mode styling issues in content editor

### Accessibility
- **[#229876](https://github.com/elastic/kibana/pull/229876)** Incorrect focus order (backported to 5 versions)
- **[#219519](https://github.com/elastic/kibana/pull/219519)** Delete dialog screen reader announcement

---

## Key Enhancements

### Search & Filtering
- **[#197307](https://github.com/elastic/kibana/pull/197307)** Character validation hints in search
- **[#142108](https://github.com/elastic/kibana/pull/142108)** Enhanced tag filtering with multi-tag support
- **[#182577](https://github.com/elastic/kibana/pull/182577)** Hide tag filter when not available
- **[#241828](https://github.com/elastic/kibana/pull/241828)** Expanded tag filter panel for long tags

### Sorting & Organization
- **[#241591](https://github.com/elastic/kibana/pull/241591)** Starred/favorited dashboards filter
- **[#184667](https://github.com/elastic/kibana/pull/184667)** Persistent table sorting preferences
- **[#187564](https://github.com/elastic/kibana/pull/187564)** Recently viewed sorting
- **[#142616](https://github.com/elastic/kibana/pull/142616)** Sorting dropdown

### Metadata & Display
- **[#132321](https://github.com/elastic/kibana/pull/132321)** Last updated metadata
- **[#193964](https://github.com/elastic/kibana/pull/193964)** Improved date format
- **[#184641](https://github.com/elastic/kibana/pull/184641)** Managed objects display in creator column
- **[#202488](https://github.com/elastic/kibana/pull/202488)** Better help text for creator and view count
- **[#140947](https://github.com/elastic/kibana/pull/140947)** Grouped title, description, and tags

### Accessibility
- **[#125334](https://github.com/elastic/kibana/pull/125334)** Screen reader labels for edit buttons
- **[#188774](https://github.com/elastic/kibana/pull/188774)** Focus management via context

### Architecture
- **[#135807](https://github.com/elastic/kibana/pull/135807)** Refactored from class to function component
- **[#154464](https://github.com/elastic/kibana/pull/154464)** Cross-type search support
- **[#176263](https://github.com/elastic/kibana/pull/176263)** Readonly mode for managed content
- **[#154295](https://github.com/elastic/kibana/pull/154295)** Exportable Dashboard Listing Table

---

## Open Issues

**[#144402](https://github.com/elastic/kibana/issues/144402)** API Documentation incomplete
- Affects: `table_list_view`, `table_list_view_table`, `tabbed_table_list_view`, `content_editor` README files
- Priority: Medium | Impact: Developer experience

---

## Component Health

| Metric | Status |
|--------|--------|
| Stability | High - no recent critical bugs |
| Maintenance | Active - 82+ commits |
| Accessibility | Excellent - 4 major improvements |
| Performance | Good - typing lag fixed |
| Documentation | Needs improvement |

---

## Common Issue Patterns

**By Category:**
1. Search/Filtering (4 bugs, 5 enhancements)
2. State Management (4 bugs)
3. Accessibility (4 fixes)
4. Visual/UI (10+ enhancements)
5. Data Integrity (2 critical bugs)

**Backport Activity:** Fixes distributed across 8.x, 8.9, 8.17-8.19, 9.0-9.2 indicate component criticality

---

## Related Planning Documents

- [PROPOSAL_CONTENT_LIST_PAGE.md](../proposals/PROPOSAL_CONTENT_LIST_PAGE.md) - Composable architecture refactoring
- [CURRENT_USAGE.md](./CURRENT_USAGE.md) - Existing implementation analysis
- [LISTING_COMPONENT.md](../LISTING_COMPONENT.md) - Component design
- [LISTING_PAGE.md](../LISTING_PAGE.md) - Page-level patterns

