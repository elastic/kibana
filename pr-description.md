## Summary

Fixes misleading "last year" date display in workflow execution list when dates cross year boundaries.

**Issue:** https://github.com/elastic/security-team/issues/15310

### Problem

The "Last run" column in the workflows list was displaying "last year" for executions that happened only 2-3 weeks ago, simply because they crossed the calendar year boundary (e.g., Dec 20, 2025 viewed on Jan 10, 2026).

### Solution

Added a fix to `FormattedRelativeEnhanced`: when `selectUnit` from `@formatjs/intl-utils` returns "year" but less than 180 days (6 months) have actually passed, we use a more appropriate unit (weeks or months) instead.

### Changes

**`formatted_relative_enhanced.tsx`:**
- Added year boundary fix: converts "year" to "weeks" or "months" when < 180 days have passed
- Refactored tooltip logic into separate `WithTooltip` component to avoid calling `useFormattedDateTime` hook when `fullDateTooltip=false` (fixes unnecessary hook call and improves testability)

**`status_badge.tsx`** and **`workflow_execution_list_item.tsx`:**
- Use `FormattedRelativeEnhanced` instead of `FormattedRelative`

**`status_badge.test.tsx`:**
- Added tests for year boundary scenarios

### Before

| Execution Date | Current Date | Display |
|----------------|--------------|---------|
| Dec 20, 2025 | Jan 10, 2026 | "last year" |
| Nov 10, 2025 | Jan 10, 2026 | "last year" |

### After

| Execution Date | Current Date | Display |
|----------------|--------------|---------|
| Dec 20, 2025 | Jan 10, 2026 | "3 weeks ago" |
| Nov 10, 2025 | Jan 10, 2026 | "2 months ago" |

All other relative time displays (weeks, days, hours, etc.) remain unchanged.

## Test Plan

- [x] Unit tests verify dates crossing year boundaries don't show "last year" when < 180 days old
- [ ] Manual verification: View workflow execution list with executions from late December when current date is early January
- [ ] Verify "last week", "2 weeks ago" etc. still work as before
