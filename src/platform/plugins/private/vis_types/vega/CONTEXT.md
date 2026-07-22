# Vega ES|QL time handling

Domain language for how Vega ES|QL data sources relate to the global time picker.

## Language

**Time field directive**:
The `%timefield%` value on an ES|QL data URL. Either a source field name (string) or absent (resolve the default time field). There is no `false` / opt-out value. Absent and undefined are not opt-out. An explicit string is trusted as-is (no field-existence validation in v1).
_Avoid_: timefield flag, enable time params, boolean timefield, `%timefield%: false`, treating undefined as skip time

**Default time field**:
The index/data-view’s implicit time field used when the time field directive is absent, resolved the same way Discover does for ES|QL. If none exists, time cannot be applied. Explicit time field directive always wins over the default.
_Avoid_: implicit `%timefield%`, fallback timefield, parsing `WHERE … ?_tstart` as the primary default

**Time filter**:
A source-level DSL range on the resolved time field, applied via the ES|QL `filter` parameter for the selected time range. Independent of `%context%` (dashboard filters/KQL). When a time field is resolvable, the time picker always filters; there is no all-time escape on time-based indices.
_Avoid_: WHERE injection, query rewrite, row filter in query text, gating time on `%context%`, all-time opt-out

**Time params**:
Named ES|QL parameters `?_tstart` / `?_tend` bound to the selected time range whenever they appear in the query text (e.g. `BUCKET` extent). Binding does not require a time field directive.
_Avoid_: timefield binding, gating params on `%timefield%`, warning when `%timefield%` lacks params

**BUCKET column naming**:
Authoring concern when an unaliased `BUCKET(...)` output column name does not match the Vega encoding field. Out of scope for time-filter work.
_Avoid_: treating empty charts from column mismatch as a time-filter bug

**Resolved time field**:
The source field name used for the time filter: the time field directive if present, otherwise the default time field. Aliases from `EVAL` / `RENAME` are not traced; filtering always uses this source field.
_Avoid_: derived time column, alias tracing, query AST rewrite for time
