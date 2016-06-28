# 1.3.1

* Fixes an issue where the module would convert values in gradient/url functions
  since 1.3.0.

# 1.3.0

* Converted the module to use ES6.
* balanced-match, css-list & some integrated code has been replaced with
  postcss-value-parser; reducing the number of moving parts in this module, and
  providing a more futureproof way of parsing CSS numeric values.

# 1.2.5

* Fixes an issue where uppercase units (such as PX) were being deleted.

# 1.2.4

* Fixes convert not px or ms

# 1.2.3

* Adds support for `ch` units; previously they were removed.
* Upgrades css-list to `0.1.0`, code tidied up.

# 1.2.2

* Added support for viewport units (thanks to @TrySound).

# 1.2.1

* Fixes regressions introduced by the previous patch. Better support for
  negative value transforms.

# 1.2.0

* Adds support for slash/comma separated values (thanks to @TrySound).

# 1.1.1

* Fixes an issue where trailing zeroes were not being removed in
  values that were not `0` (thanks to @TrySound).

# 1.1.0

* Adds support for removing leading zeroes from `rem` values
  (thanks to @tunnckoCore).

# 1.0.3

* Fixed a bug where filenames were being incorrectly transformed.

# 1.0.2

* Fixed a bug where `1.` and `.0` were not being optimised to `1` and `0`,
  respectively.

# 1.0.1

* Fixed a bug where `undefined` would be stringified as the unit value, if the
  value did not have a unit.

# 1.0.0

* Initial release.
