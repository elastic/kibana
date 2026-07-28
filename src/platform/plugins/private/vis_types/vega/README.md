# Vega

Dashboard supports a dedicated by-value `vega` panel. Its stored config holds a `spec` string
(JSON or HJSON); title, time range, and drilldown fields are optional. The string is preserved
exactly, so comments and formatting round-trip.

Add or edit a panel from Dashboard's **Add panel** menu. Editing does not run the spec's queries as
you type: **Preview** renders the current spec on the panel, **Apply and close** commits it to the
dashboard, and any other close — Cancel, Esc, or click-away — reverts, removing a new panel or
restoring an existing panel's prior spec.

Creation is gated by the `vega.standaloneEmbeddable` browser feature flag (off by default). The
embeddable definition itself is always registered so existing panels keep rendering after a flag
rollback; only the creation actions attach and detach as the flag changes.

The `vega` panel type is **UI-only**: it registers no server embeddable definition and therefore has
no runtime config schema. Dashboard's public REST API treats it as an unmapped panel — it is absent
from the generated OpenAPI, public writes reject it, and public reads drop it with a `dropped_panel`
warning. The Dashboard application's own internal save/load routes store and return the panel as-is
(no server-side validation of the spec; validation is a render/editor concern). Public REST API
support is deferred to a later change.

The dedicated panel uses the existing Vega renderer and URL policy. External URLs are controlled by
`vis_type_vega.enableExternalUrls`; no additional Vega URL setting exists.

## Developer Notes

`ExternalUrlService.isInternalUrl` currently treats same-origin Kibana URLs as internal. Vega
`data.url` requests to those URLs can still use the viewer's Kibana session, so the sandboxed
renderer must not be treated as a full SSRF or credentialed internal-request mitigation. The
`openspec/changes/vega-sandboxed-rendering` design tracks this as the D9 gap; tighten the URL policy
separately if Kibana later needs to restrict which internal endpoints Vega may query.
