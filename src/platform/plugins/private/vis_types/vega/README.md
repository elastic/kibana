# Vega

Dashboard supports a dedicated by-value `vega` panel. Its stored config holds a `spec` string
(JSON or HJSON); title, time range, and drilldown fields are optional. The string is preserved
exactly, so comments and formatting round-trip.

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
