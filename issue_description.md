# Ingest Pipelines: Remove encoding workarounds after history v5

## Context

During the migration from SCSS to Emotion CSS-in-JS (PR #234444), we identified and implemented workarounds for encoding issues related to CSS class name pattern matching in tests and component logic. These workarounds were necessary due to how CSS class names are generated and encoded differently between SCSS and Emotion systems.

## Encoding Problem

The core issue stems from how CSS class names are encoded and referenced when transitioning between styling systems:

1. **SCSS class names**: Generated with predictable patterns like `className--displayNone`
2. **Emotion class names**: Generated with hashed/encoded identifiers that break string pattern matching
3. **Test assertions**: Relying on string matching against className patterns fails with Emotion's dynamic class generation

## Current Workarounds

### 1. Computed Style Fallback in Tests

**Location**: `x-pack/platform/plugins/shared/ingest_pipelines/public/application/components/pipeline_editor/__jest__/pipeline_processors_editor.test.tsx`

**Before (SCSS approach)**:
```typescript
expect(
  (
    find(`processors>${processorIndex}.pipelineProcessorItemDescriptionContainer`).props()
      .className as string
  ).includes('--displayNone')
).toBe(!descriptionVisible);
```

**After (Emotion workaround)**:
```typescript
const descriptionContainer = find(
  `processors>${processorIndex}.pipelineProcessorItemDescriptionContainer`
);

expect(descriptionContainer.exists()).toBe(true);

if (descriptionVisible) {
  expect(
    window.getComputedStyle(descriptionContainer.getDOMNode()).getPropertyValue('display')
  ).not.toBe('none');
} else {
  expect(
    window.getComputedStyle(descriptionContainer.getDOMNode()).getPropertyValue('display')
  ).toBe('none');
}
```

**Scenario**: Testing visibility states of processor description containers where SCSS class pattern matching (`--displayNone`) was replaced with computed style inspection.

### 2. CSS Prop Direct Styling

**Location**: Multiple component files in the Ingest Pipelines module

**Pattern**: Replace className-based conditional styling with direct CSS prop application:

```typescript
// Before (SCSS pattern)
const containerClasses = classNames({
  'pipelineProcessorsEditor__item--displayNone': hidden,
});
<div className={containerClasses}>

// After (Emotion workaround)  
const getStyles = ({ hidden }: { hidden?: boolean }) => ({
  container: hidden ? css`display: none;` : undefined,
});
<div css={styles.container}>
```

**Scenarios**: 
- Context menu visibility (`context_menu.tsx`)
- Processor item display states (`pipeline_processors_editor_item.tsx`)
- Drop zone button states (`drop_zone_button.tsx`)

## Impact on React Router 6 Migration

These workarounds are specifically problematic for the upcoming React Router 6 migration with history v4 because:

1. **DOM Access Patterns**: `window.getComputedStyle()` and `getDOMNode()` calls may conflict with React Router 6's enhanced rendering optimizations
2. **Test Environment Compatibility**: History v4 changes how component testing environments handle DOM node access
3. **SSR Considerations**: Computed style workarounds may not work correctly with React Router 6's improved server-side rendering

## Removal Plan

After migrating to React Router 6 (with history v4), these workarounds should be reversed by:

1. **Eliminating computed style checks**: Replace `window.getComputedStyle()` patterns with more appropriate React testing approaches
2. **Using data attributes**: Implement `data-test-subj` or similar attributes for test assertions instead of computed styles
3. **Leveraging React Router 6 patterns**: Utilize new router-aware testing utilities that handle dynamic styling better

## References

- Original migration: PR #234444
- Related issue: #205027 (SCSS removal)
- Future dependency: React Router 6 migration with history v4