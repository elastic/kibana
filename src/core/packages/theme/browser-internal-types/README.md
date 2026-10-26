# @kbn/core-theme-browser-internal-types

Internal type definitions for the theme service: `InternalThemeServiceStart`.

`InternalThemeServiceStart` extends the public `ThemeServiceStart` with `setDarkMode()`, a dev-only API to switch the color theme live without a page reload. Plugins should use `ThemeServiceStart` from `@kbn/core-theme-browser` instead.

Kept in a standalone leaf package (single dep: `@kbn/core-theme-browser`) so consumers can reference the internal type without depending on the implementation package `@kbn/core-theme-browser-internal`.
