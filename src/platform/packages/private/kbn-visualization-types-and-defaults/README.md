# @kbn/visualization-types-and-defaults

This package contains all types and default values.
Types and constants have been renamed to use consistent conventions:

* Constants are now all UPPER_CASE
* Both types and constants now explicitly name their target (i.e. viz type, if they are targetting Lens or expression or both)
* Types are originally defined for the Expression plugin, then Lens should extends and/or fork those
* Avoid duplication as much as possible