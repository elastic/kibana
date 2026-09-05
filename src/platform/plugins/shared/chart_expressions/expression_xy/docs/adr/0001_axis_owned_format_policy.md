---
status: accepted
---

# Use an axis-owned format policy for XY charts

XY charts currently plot raw numeric coordinates while axis ticks use the first series formatter and tooltips may use per-series formatters. Mixed duration source units can therefore produce incomparable coordinates, and the same point can be presented differently across an axis, tooltip, and reference line. We will resolve one format policy per evaluated axis group so coordinate normalization and presentation use the same effective runtime formats.

## Decision

- Resolve left and right axis groups independently.
- Treat the first data series in each group as the axis anchor.
- Use the anchor’s complete effective formatter for axis ticks, series tooltips, and reference-line labels.
- When the anchor has a valid duration formatter, infer the coordinate unit from its concrete output method. Use seconds when its output is `humanize` or `humanizePrecise`.
- Convert every valid duration series and reference line from its source unit into the coordinate unit, including the anchor itself.
- Leave non-duration, unformatted, and malformed values numerically unchanged as axis-relative values. Treat unknown duration input or output values as unformatted.
- Normalize duration coordinates before percentage stacking; percentage remains the rendered formatter.
- Recompute the policy immediately when axis assignment, series order, or the anchor formatter changes.
- Resolve and apply the policy after layer expressions have produced effective datatable metadata. Log original tables to Inspector before creating immutable normalized chart copies.
- Surface the inferred owner and formatter in Lens axis settings. Mark the anchor with an information icon and warn on follower formats that will be overridden or cannot be normalized safely.
- Keep policy provenance explicit so a future persisted axis-unit setting can replace inference without changing policy consumers.

## Considered options

**Lens expression planning with derived columns** was rejected because pre-execution operation metadata does not reliably include inherited data-view formats, operation defaults, time-scale wrappers, formula formats, percentage overrides, or complete ES|QL formats. Reconstructing those formats would duplicate runtime behavior and could select a different anchor from the rendered chart.

**Per-series output units on a shared axis** were rejected because equal coordinates could represent different physical durations. For example, one second and one minute could both be converted to the numeric coordinate `1`.

**A fixed seconds coordinate for every duration axis** was rejected for now because the inferred first-series policy is visible to users and can later become an explicit axis setting. Human-readable duration output still uses seconds because it has no concrete output unit.

**Normalization during React rendering** was rejected because it repeats row processing during render and couples data semantics to UI lifecycle.

## Consequences

- The XY render expression functions become the normalization seam because they have evaluated layers and their effective formats before rendering.
- The shared policy module must own grouping, anchor selection, duration-unit resolution, diagnostics, and immutable one-pass table conversion.
- Tooltip and reference-line rendering must consume the resolved axis formatter rather than independently selecting column formatters.
- Inspector and CSV continue to receive original values.
- Existing XY charts may change presentation because follower formatters no longer control tooltips or reference-line labels. Existing axis-relative values may change duration meaning when the anchor or its formatter changes; this is intentional and must be explained in the Lens UI.
- The implementation should preserve object identity for unaffected layers and traverse each affected table only once.
