/**
 * Mutually-exclusive render phase for a Content List.
 *
 * Every Content List is in exactly one phase at a time. Sections (toolbar,
 * table, footer, custom children) branch on the phase to decide what to
 * render: skeletons during `'initialLoad'`, `null` during `'empty'`, normal
 * UI during `'populated'`, and nuanced in-flight / no-match variants during
 * `'filtering'` / `'filtered'`.
 *
 * Phase transitions:
 * - `'initialLoad'` → `'empty' | 'filtered' | 'populated'` (first fetch completes).
 * - `'populated'` ↔ `'filtering'` (user applies a filter/search).
 * - `'filtering'` → `'filtered' | 'populated'` (filtered fetch completes).
 * - `'filtered'` → `'filtering' | 'populated' | 'empty'` (filter changes or
 *   is cleared).
 *
 * A refetch that does not involve a filter change stays in the current
 * phase; it does NOT re-enter `'initialLoad'`.
 */
export type ContentListPhase = 'initialLoad' | 'empty' | 'filtering' | 'filtered' | 'populated';
