# XY Axis Format Context

This context defines how numeric coordinates and value formats are shared by series and reference lines rendered on the same XY axis.

## Language

**Axis Group**:
The data series and reference lines rendered against one shared numeric axis. Left and right Y axes are separate axis groups.
_Avoid_: Side, scale group

**Axis Anchor**:
The first data series assigned to an axis group. It supplies the group’s inferred formatter and, for duration formats, its coordinate unit.
_Avoid_: Primary series, reference series

**Effective Formatter**:
The formatter present on an evaluated datatable column after inherited field formats, operation defaults, and explicit overrides have been applied.
_Avoid_: Configured formatter, saved formatter

**Axis Format Policy**:
The resolved formatter, coordinate interpretation, conversions, provenance, and compatibility diagnostics shared by an axis group.
_Avoid_: Series format policy

**Coordinate Unit**:
The numeric time unit shared by coordinates on a duration-defined axis. It is inferred from the axis anchor’s concrete output method, or seconds when the output is human-readable.
_Avoid_: Display unit, source unit

**Source Unit**:
The time unit in which a duration-formatted column’s raw numeric values are expressed.
_Avoid_: Axis unit, output unit

**Output Format**:
The presentation method used to render an axis value, such as seconds, minutes, or human-readable duration text. It does not independently define a raw value’s meaning.
_Avoid_: Coordinate unit, storage unit

**Duration-Defined Axis**:
An axis group whose anchor has a valid duration formatter. Valid duration values in the group can be converted into its coordinate unit.
_Avoid_: Duration series group

**Axis-Relative Value**:
A value without a valid duration format that remains numerically unchanged and is interpreted as a multiple of the current coordinate unit.
_Avoid_: Unitless duration

**Format Mismatch**:
A follower series or reference line whose effective formatter differs from the axis anchor’s formatter and will therefore not control presentation on that axis.
_Avoid_: Invalid format
