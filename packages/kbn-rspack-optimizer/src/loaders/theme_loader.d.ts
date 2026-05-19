import type { LoaderContext } from '@rspack/core';
interface ThemeLoaderOptions {
    bundleId: string;
    themeTags: string[];
}
/**
 * Theme loader for RSPack.
 *
 * This loader generates a `switch` statement that gets injected into the output
 * bundle for all `.scss` file imports. The generated `switch` contains:
 * - A `case` clause for each of the bundled theme tags
 * - An optional `default` clause for theme fallback logic
 *
 * At runtime, `window.__kbnThemeTag__` determines which compiled stylesheet to use.
 */
export default function themeLoader(this: LoaderContext<ThemeLoaderOptions>): string;
export {};
