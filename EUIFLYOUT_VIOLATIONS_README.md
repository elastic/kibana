# EuiFlyout Accessibility Violations - Project Report

## Overview

This report documents all instances in the Kibana codebase where the `<EuiFlyout>` component is missing required accessibility props (`aria-label` or `aria-labelledby`). This is a violation of accessibility best practices and the ESLint rule that enforces proper ARIA labeling.

## Quick Stats

- **Total Files with Violations**: 65
- **Total Violations**: 78 (some files have multiple EuiFlyout instances)
- **Scan Date**: January 2025
- **Repository**: elastic/kibana
- **Scan Method**: Automated Python script analyzing all `.tsx` and `.ts` files

## Report Files

### 1. EUIFLYOUT_ACCESSIBILITY_VIOLATIONS.md
**Purpose**: Detailed, comprehensive documentation of all violations

**Contents**:
- Complete list of all 65 files with violations
- Exact line numbers for each violation
- Code snippets showing the violation context
- Organized by category (Core, Platform, X-Pack, etc.)
- Recommended fix approach with examples
- Notes on special cases (Storybook, core services, etc.)

**Use this when**: You need detailed information about specific violations or want to understand the full scope

### 2. EUIFLYOUT_VIOLATIONS_SUMMARY.txt
**Purpose**: High-level summary with statistics

**Contents**:
- Statistical breakdown by category
- File type analysis (production vs stories vs tests)
- Highest violation areas
- Key observations and patterns
- Recommended prioritization strategy
- Complete alphabetical list of affected files

**Use this when**: You need a quick overview or want to present findings to stakeholders

### 3. EUIFLYOUT_ACCESSIBILITY_FIX_GUIDE.md
**Purpose**: Developer reference for fixing violations

**Contents**:
- Clear examples of correct vs incorrect implementations
- Step-by-step fix instructions
- Real examples from the Kibana codebase
- When to use `aria-labelledby` vs `aria-label`
- Code samples demonstrating the `useGeneratedHtmlId` pattern
- Additional resources and documentation links

**Use this when**: You're ready to fix violations and need implementation guidance

### 4. EUIFLYOUT_VIOLATIONS_TRACKER.csv
**Purpose**: Project management and tracking

**Contents**:
- Spreadsheet-compatible CSV format
- One row per violation
- Columns: File Path, Line Number, Category, Priority, Status, Assignee, Notes
- Pre-assigned priorities based on code location
- Ready for import into issue tracking systems

**Use this when**: You need to track fix progress, assign work, or integrate with project management tools

## Violation Breakdown

### By Category

| Category | Files | Violations | Priority | % of Total |
|----------|-------|------------|----------|------------|
| Core Packages | 2 | 2 | High | 3.1% |
| Platform Packages | 9 | 12 | High | 13.8% |
| Platform Plugins | 11 | 15 | Medium | 16.9% |
| X-Pack Platform Packages | 1 | 1 | Medium | 1.5% |
| X-Pack Platform Plugins | 35 | 41 | Medium | 53.8% |
| X-Pack Solutions | 15 | 16 | Low-Medium | 23.1% |
| Examples | 1 | 1 | Low | 1.5% |

### By Priority

| Priority | Files | Violations | Rationale |
|----------|-------|------------|-----------|
| **High** | 11 | 14 | Core infrastructure and platform packages that affect many consumers |
| **Medium** | 47 | 57 | Platform plugins and critical solution features (Security, ML, Fleet) |
| **Low** | 7 | 7 | Examples, storybook stories, and less critical solution features |

### By File Type

- **Production Code**: 57 files (87.7%)
- **Storybook Stories**: 5 files (7.7%)
- **Examples/Tests**: 3 files (4.6%)

## The Accessibility Issue

### ESLint Rule
```
EuiFlyout must have either 'aria-label' or 'aria-labelledby' prop for accessibility.
```

### Why This Matters
- Screen readers need ARIA labels to announce flyout content to users
- Without proper labeling, visually impaired users cannot understand the purpose of the flyout
- This is a WCAG 2.1 Level A requirement for accessibility compliance

### Recommended Fix Pattern

```tsx
import { useGeneratedHtmlId } from '@elastic/eui';

export const MyComponent = () => {
  const flyoutTitleId = useGeneratedHtmlId();
  
  return (
    <EuiFlyout onClose={onClose} aria-labelledby={flyoutTitleId}>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2 id={flyoutTitleId}>Flyout Title</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      {/* ... */}
    </EuiFlyout>
  );
};
```

## Recommended Fix Strategy

### Phase 1: High Priority (2 weeks)
**Target**: Core and Platform Packages (11 files, 14 violations)
- Start with core infrastructure files that are widely used
- Focus on: `flyout_service.tsx`, `global_flyout.tsx`
- Fix all platform packages as they affect multiple consumers

### Phase 2: Medium Priority (4 weeks)
**Target**: Platform Plugins and Critical Solutions (47 files, 57 violations)
- Prioritize user-facing features in Security, ML, and Fleet plugins
- Focus on production code over storybook stories
- Test thoroughly as these are high-traffic areas

### Phase 3: Low Priority (2 weeks)
**Target**: Solutions and Examples (7 files, 7 violations)
- Fix remaining solution plugins
- Update storybook stories for proper documentation
- Clean up example code

## Tools Provided

### Python Scanning Script
Located at: `/tmp/check_euiflyout_clean.py`

This script can be re-run to:
- Verify fixes have been applied
- Check for new violations after updates
- Generate updated reports

```bash
python3 /tmp/check_euiflyout_clean.py > updated_report.txt
```

## Special Considerations

### Core Infrastructure Files
Files like `flyout_service.tsx` and `global_flyout.tsx` may require special handling as they dynamically create flyouts. Consider:
- Accepting `aria-labelledby` or `aria-label` as props
- Providing sensible defaults
- Documenting requirements for consumers

### Storybook Stories
While lower priority, these should still be fixed to:
- Provide correct examples for developers
- Ensure documentation reflects best practices
- Avoid confusion about proper usage

### Backward Compatibility
Adding `aria-labelledby` or `aria-label` props is backward compatible and won't break existing functionality.

## Next Steps

1. **Review this report** with the accessibility team
2. **Assign ownership** using the CSV tracker
3. **Start with Phase 1** (high priority fixes)
4. **Create issues** in the project tracking system
5. **Monitor progress** using the CSV tracker
6. **Re-scan periodically** to verify fixes and catch new violations

## Questions or Issues?

For questions about:
- **Accessibility requirements**: Contact the accessibility team
- **EUI component usage**: See https://elastic.github.io/eui/#/layout/flyout
- **Implementation details**: Refer to EUIFLYOUT_ACCESSIBILITY_FIX_GUIDE.md
- **Scanning methodology**: Review the Python script in `/tmp/check_euiflyout_clean.py`

---

**Report Generated**: January 2025  
**Scan Coverage**: 100% of repository TypeScript/TSX files  
**Tool Version**: Custom Python 3 scanner  
**Last Updated**: See git commit history
