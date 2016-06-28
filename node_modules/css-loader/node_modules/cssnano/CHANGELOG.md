# 2.6.1

* Improved performance of the core module `functionOptimiser`.

# 2.6.0

* Adds a new optimisation which re-orders properties that accept values in
  an arbitrary order. This can lead to improved merging behaviour in certain
  cases.

# 2.5.0

* Adds support for disabling modules of the user's choosing, with new option
  names. The old options (such as `merge` & `fonts`) will be removed in `3.0`.

# 2.4.0

* postcss-minify-selectors was extended to add support for conversion of
  `::before` to `:before`; this release removes the dedicated
  postcss-pseudoelements module.

# 2.3.0

* Consolidated postcss-minify-trbl & two integrated modules into
  postcss-merge-longhand.

# 2.2.0

* Replaced integrated plugin filter with postcss-filter-plugins.
* Improved rule merging logic.
* Improved performance across the board by reducing AST iterations where it
  was possible to do so.
* cssnano will now perform better whitespace compression when used with other
  PostCSS plugins.

# 2.1.1

* Fixes an issue where options were not passed to normalize-url.

# 2.1.0

* Allow `postcss-font-family` to be disabled.

# 2.0.3

* cssnano can now be consumed with the parentheses-less method in PostCSS; e.g.
  `postcss([ cssnano ])`.
* Fixes an issue where 'Din' was being picked up by the logic as a numeric
  value, causing the full font name to be incorrectly rearranged.

# 2.0.2

* Extract trbl value reducing into a separate module.
* Refactor core longhand optimiser to not rely on trbl cache.
* Adds support for `ch` units; previously they were removed.
* Fixes parsing of some selector hacks.
* Fixes an issue where embedded base 64 data was being converted as if it were
  a URL.

# 2.0.1

* Add `postcss-plugin` keyword to package.json.
* Wraps all core processors with the PostCSS 4.1 plugin API.

# 2.0.0

* Adds removal of outdated vendor prefixes based on browser support.
* Addresses an issue where relative path separators were converted to
  backslashes on Windows.
* cssnano will now detect previous plugins and silently disable them when the
  functionality overlaps. This is to enable faster interoperation with cssnext.
* cssnano now exports as a PostCSS plugin. The simple interface is exposed
  at `cssnano.process(css, opts)` instead of `cssnano(css, opts)`.
* Improved URL detection when using two or more in the same declaration.
* node 0.10 is no longer officially supported.

# 1.4.3

* Fixes incorrect minification of `background:none` to `background:0 0`.

# 1.4.2

* Fixes an issue with nested URLs inside `url()` functions.

# 1.4.1

* Addresses an issue where whitespace removal after a CSS function would cause
  rendering issues in Internet Explorer.

# 1.4.0

* Adds support for removal of unused `@keyframes` and `@counter-style` at-rules.
* comments: adds support for user-directed removal of comments, with the
  `remove` option (thanks to @dmitrykiselyov).
* comments: `removeAllButFirst` now operates on each CSS tree, rather than the
  first one passed to cssnano.

# 1.3.3

* Fixes incorrect minification of `border:none` to `border:0 0`.

# 1.3.2

* Improved selector minifying logic, leading to better compression of attribute
  selectors.
* Improved comment discarding logic.

# 1.3.1

* Fixes crash on undefined `decl.before` from prior AST.

# 1.3.0

* Added support for bundling cssnano using webpack (thanks to @MoOx).

# 1.2.1

* Fixed a bug where a CSS function keyword inside its value would throw
  an error.

# 1.2.0

* Better support for merging properties without the existance of a shorthand
  override.
* Can now 'merge forward' adjacent rules as well as the previous 'merge behind'
  behaviour, leading to better compression.
* Selector re-ordering now happens last in the chain of plugins, to help clean
  up merged selectors.

# 1.1.0

* Now can merge identifiers such as `@keyframes` and `@counter-style` if they
  have duplicated properties but are named differently.
* Fixes an issue where duplicated keyframes with the same name would cause
  an infinite loop.

# 1.0.2

* Improve module loading logic (thanks to @tunnckoCore).
* Improve minification of numeric values, with better support for `rem`,
  trailing zeroes and slash/comma separated values
  (thanks to @TrySound & @tunnckoCore).
* Fixed an issue where `-webkit-tap-highlight-color` values were being
  incorrectly transformed to `transparent`. This is not supported in Safari.
* Added support for viewport units (thanks to @TrySound).
* Add MIT license file.

# 1.0.1

* Add repository/author links to package.json.

# 1.0.0

* Initial release.
