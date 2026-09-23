# Vega

Dashboard supports a dedicated by-value `vega` panel. Its stored config holds a `spec` object with
either `{ format: 'hjson', value: string }` or `{ format: 'json', value: object }`; title, time range,
and drilldown fields are optional. HJSON strings are preserved exactly, so comments and formatting
round-trip.

Add or edit a panel from Dashboard's **Add panel** menu. Editing does not run the spec's queries as
you type: **Run Preview** renders the current spec on the panel, **Apply and close** commits it to the
dashboard, and any other close — Cancel, Esc, or click-away — reverts, removing a new panel or
restoring an existing panel's prior spec.

Creation and panel JSON export are gated by the `vega.standaloneEmbeddable` feature flag (off by
default). The embeddable definition itself is always registered so existing panels keep rendering
after a flag rollback; only the creation actions attach and detach as the flag changes.

When the flag is enabled, `visTypeVega` also registers a server embeddable schema for
`type: vega`, so Dashboard's public REST API and generated OpenAPI include `vega` and validate its
config. When disabled, the public API treats `vega` as an unmapped panel type: writes reject it
and reads drop stored panels with a `dropped_panel` warning. The Dashboard app's own internal
save/load routes store and return it as-is.

## Legacy Vega migration (read path only)

The `dashboard.legacyVegaPanelMigration` feature flag (default **false**) enables a read-path
migration from stored `legacy_vis` Vega panels (visualization saved objects) to first-class `vega`
panels when `vega.standaloneEmbeddable` is also enabled. Because the standalone embeddable flag
controls server schema registration, enable it before starting Kibana.

- **Either flag disabled (default)**: migration returns no results.
- **Both flags enabled**:
  - **By-value** `legacy_vis` Vega panels use the same format inference as the legacy editor. Specs
    that parse as strict JSON objects become `spec: { format: 'json', value: parsedSpec }`; all
    others become `spec: { format: 'hjson', value: savedVis.params.spec }`, preserving their exact
    text.
  - **By-reference** `legacy_vis` Vega panels are intentionally **not** migrated yet. They remain
    `legacy_vis` until the standalone Vega embeddable supports library (by-reference) state. A
    non-empty `savedObjectId` takes precedence when a panel also contains inline `savedVis` state.

When a panel is migrated, supported panel-level fields (titles, hide flags, optional `time_range`,
and drilldowns) are preserved, and the stored dashboard saved object remains unchanged.
