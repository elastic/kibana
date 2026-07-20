# Vega

Dashboard supports a dedicated by-value `vega` panel. Its REST config requires a `spec` string
(JSON or HJSON); title fields are optional. The string is preserved exactly, so comments and
formatting round-trip.

Add or edit a Vega panel from Dashboard's **Add panel** menu. A new panel is added immediately so
the Dashboard previews spec edits as you type; Cancel removes a new panel or restores an existing
panel's prior spec. There is no library item or by-reference Vega panel. Existing `legacy_vis` Vega
panels and Canvas creation remain legacy behavior.

The dedicated panel uses the existing Vega renderer and URL policy. External URLs are controlled by
`vis_type_vega.enableExternalUrls`; no additional Vega URL setting exists.
