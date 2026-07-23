# Vega

Dashboard supports a dedicated by-value `vega` panel. Its stored config holds a `spec` string
(JSON or HJSON); title, time range, and drilldown fields are optional. The string is preserved
exactly, so comments and formatting round-trip.

Add or edit a Vega panel from Dashboard's **Add panel** menu. A new panel is added immediately so
the Dashboard previews spec edits as you type; Cancel removes a new panel or restores an existing
panel's prior spec. There is no library item or by-reference Vega panel. Existing `legacy_vis` Vega
panels and Canvas creation remain legacy behavior.

The Dashboard **Add panel** action is gated by the `vega.dashboardEmbeddable` browser feature flag
(off by default). The public embeddable definition is always registered so existing Vega panels keep
rendering after a flag rollback; only the creation action attaches/detaches as the flag changes.

The `vega` panel type is **UI-only**: it registers no server embeddable definition and therefore has
no runtime config schema. Dashboard's public REST API treats it as an unmapped panel — it is absent
from the generated OpenAPI, public writes reject it, and public reads drop it with a `dropped_panel`
warning. The Dashboard application's own internal save/load routes store and return the panel as-is
(no server-side validation of the spec; validation is a render/editor concern). Public REST API
support is deferred to a later change.

The dedicated panel uses the existing Vega renderer and URL policy. External URLs are controlled by
`vis_type_vega.enableExternalUrls`; no additional Vega URL setting exists.
