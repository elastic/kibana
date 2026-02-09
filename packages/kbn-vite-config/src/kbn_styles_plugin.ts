/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import type { Plugin, UserConfig } from 'vite';

export interface KbnStylesPluginOptions {
  /**
   * The root directory of the Kibana repository
   */
  repoRoot: string;

  /**
   * Theme tags to support (e.g., ['k7light', 'k7dark', 'k8light', 'k8dark'])
   */
  themeTags?: string[];

  /**
   * Whether this is a production build
   */
  isProduction?: boolean;
}

/**
 * Default Kibana theme tags
 */
export const DEFAULT_THEME_TAGS = ['borealislight', 'borealisdark'] as const;

/**
 * Plugin that handles SCSS theme compilation similar to webpack's sass-loader setup.
 * Supports theme-specific query parameters (e.g., ?k7light, ?k7dark).
 */
export function kbnStylesPlugin(options: KbnStylesPluginOptions): Plugin {
  const {
    repoRoot,
    themeTags = DEFAULT_THEME_TAGS as unknown as string[],
    isProduction = false,
  } = options;

  if (!repoRoot) {
    throw new Error(
      `kbnStylesPlugin requires a valid repoRoot option, but received: ${JSON.stringify(repoRoot)}`
    );
  }

  const nodeModulesPath = Path.resolve(repoRoot, 'node_modules');

  // Cache for rewritten EUI SCSS file content — these files never change at
  // runtime (they're in node_modules) so we can cache them indefinitely.
  const scssContentCache = new Map<string, { code: string; map: null } | undefined>();

  // Pre-compiled regex for theme query matching (avoid re-compiling per call)
  const themeQueryRegex = /^(.+\.scss)\?(\w+)$/;
  const themeVirtualRegex = /^\0kbn-theme:(\w+):(.+)$/;
  const elasticImportRegex = /@import\s+['"]node_modules\/@elastic\/([^'"]+)['"]/g;

  return {
    name: 'kbn-styles',
    // Run before other plugins to rewrite imports
    enforce: 'pre',

    resolveId(source) {
      // Fast path: skip anything that doesn't contain .scss
      // (the vast majority of imports). charCodeAt avoids string allocation.
      if (!source.includes('.scss')) {
        return null;
      }

      // Handle SCSS imports with theme query parameters
      const match = source.match(themeQueryRegex);
      if (match) {
        const [, filePath, theme] = match;
        if (themeTags.includes(theme)) {
          // Return a virtual module ID for the themed SCSS
          return `\0kbn-theme:${theme}:${filePath}`;
        }
      }

      return null;
    },

    load(id) {
      // Handle virtual themed SCSS modules
      if (id.startsWith('\0kbn-theme:')) {
        const [, theme, filePath] = id.match(themeVirtualRegex) || [];
        if (!theme || !filePath) {
          return null;
        }

        // Generate SCSS that imports the theme globals and the actual file
        const globalsPath = Path.resolve(
          repoRoot,
          `src/core/public/styles/core_app/_globals_${theme}.scss`
        );

        return {
          code: `@import "${globalsPath}";\n@import "${filePath}";`,
          map: null,
        };
      }

      // Intercept EUI theme SCSS files in node_modules to rewrite problematic imports.
      // These files don't change at runtime, so we cache the result.
      if (id.includes('node_modules/@elastic/') && id.endsWith('.scss')) {
        if (scssContentCache.has(id)) {
          return scssContentCache.get(id) ?? null;
        }

        try {
          const content = Fs.readFileSync(id, 'utf-8');

          // Rewrite node_modules/@elastic/... imports to absolute paths
          const rewrittenContent = content.replace(
            elasticImportRegex,
            (_match: string, importPath: string) => {
              const absolutePath = Path.resolve(nodeModulesPath, '@elastic', importPath).replace(
                /\\/g,
                '/'
              );
              return `@import '${absolutePath}'`;
            }
          );

          if (rewrittenContent !== content) {
            const result = { code: rewrittenContent, map: null as null };
            scssContentCache.set(id, result);
            return result;
          }

          scssContentCache.set(id, undefined);
        } catch (e) {
          scssContentCache.set(id, undefined);
          // If we can't read the file, let Vite handle it normally
        }
      }

      return null;
    },

    config() {
      // Import EUI theme files directly using absolute paths to avoid package.json exports issues
      // This makes mixins like euiFocusRing available in all SCSS files
      const euiThemeBorealis = Path.resolve(
        repoRoot,
        'node_modules/@elastic/eui-theme-borealis/src'
      );
      const euiThemeCommon = Path.resolve(repoRoot, 'node_modules/@elastic/eui-theme-common/src');

      // Import EUI theme files in the correct order.
      // Multiple EUI theme files use the problematic @import 'node_modules/@elastic/...' pattern.
      // We avoid importing those files and instead import their dependencies directly using absolute paths.
      //
      // Files with problematic imports that we must avoid:
      // - variables/_index.scss (imports size, responsive, typography from eui-theme-common)
      // - variables/colors/_colors_light.scss (imports functions/index from eui-theme-common)
      // - theme_light.scss (imports global_styling/index from eui-theme-common)
      //
      // Instead, we import the dependencies directly and inline the color variables.
      // Note: This string is only computed once per config() call (Vite calls it once at startup).
      const additionalData = `
// 1. Import functions from eui-theme-common (needed by colors)
@import "${euiThemeCommon.replace(/\\/g, '/')}/global_styling/functions/index";

// 2. Import common variables that borealis/variables/_index.scss would have imported
@import "${euiThemeCommon.replace(/\\/g, '/')}/global_styling/variables/size";
@import "${euiThemeCommon.replace(/\\/g, '/')}/global_styling/variables/responsive";
@import "${euiThemeCommon.replace(/\\/g, '/')}/global_styling/variables/typography";

// 3. Import semantic colors (base primitives)
@import "${euiThemeBorealis.replace(/\\/g, '/')}/variables/colors/semantic_colors";

// 4. Inlined from _colors_light.scss (avoiding the problematic import)
$euiColorGhost: $euiColorWhite !default;
$euiColorInk: $euiColorBlack !default;
$euiColorPrimary: $euiColorPrimary90 !default;
$euiColorAccent: $euiColorAccent90 !default;
$euiColorAccentSecondary: $euiColorAccentSecondary90 !default;
$euiColorSuccess: $euiColorSuccess90 !default;
$euiColorWarning: $euiColorWarning40 !default;
$euiColorDanger: $euiColorDanger90 !default;
$euiColorEmptyShade: $euiColorPlainLight !default;
$euiColorLightestShade: $euiColorShade15 !default;
$euiColorLightShade: $euiColorShade30 !default;
$euiColorMediumShade: $euiColorShade60 !default;
$euiColorDarkShade: $euiColorShade90 !default;
$euiColorDarkestShade: $euiColorShade120 !default;
$euiColorFullShade: $euiColorPlainDark !default;
$euiPageBackgroundColor: $euiColorShade10 !default;
$euiColorHighlight: $euiColorPrimary10 !default;
$euiColorBackgroundBasePrimary: $euiColorPrimary10 !default;
$euiColorBackgroundBaseAccent: $euiColorAccent10 !default;
$euiColorBackgroundBaseAccentSecondary: $euiColorAccentSecondary10 !default;
$euiColorBackgroundBaseNeutral: $euiColorNeutral10 !default;
$euiColorBackgroundBaseSuccess: $euiColorSuccess10 !default;
$euiColorBackgroundBaseWarning: $euiColorWarning10 !default;
$euiColorBackgroundBaseRisk: $euiColorRisk10 !default;
$euiColorBackgroundBaseDanger: $euiColorDanger10 !default;
$euiColorBackgroundBaseSubdued: $euiColorShade10 !default;
$euiColorBackgroundBasePlain: $euiColorPlainLight !default;
$euiColorBackgroundBaseDisabled: $euiColorShade15 !default;
$euiColorBackgroundBaseHighlighted: $euiColorShade10 !default;
$euiColorBackgroundBaseFormsPrepend: $euiColorShade15 !default;
$euiColorBackgroundBaseFormsControlDisabled: $euiColorShade30 !default;
$euiColorBackgroundBaseInteractiveHover: $euiColorPrimary100Alpha4 !default;
$euiColorBackgroundBaseInteractiveSelect: $euiColorPrimary10 !default;
$euiColorBackgroundBaseInteractiveSelectHover: $euiColorPrimary20 !default;
$euiColorBackgroundBaseInteractiveOverlay: $euiColorShade100Alpha70 !default;
$euiColorBackgroundBaseSkeletonEdge: $euiColorShade100Alpha16 !default;
$euiColorBackgroundBaseSkeletonMiddle: $euiColorShade100Alpha4 !default;
$euiColorBackgroundLightPrimary: $euiColorPrimary20 !default;
$euiColorBackgroundLightAccent: $euiColorAccent20 !default;
$euiColorBackgroundLightAccentSecondary: $euiColorAccentSecondary20 !default;
$euiColorBackgroundLightNeutral: $euiColorNeutral20 !default;
$euiColorBackgroundLightSuccess: $euiColorSuccess20 !default;
$euiColorBackgroundLightWarning: $euiColorWarning20 !default;
$euiColorBackgroundLightRisk: $euiColorRisk20 !default;
$euiColorBackgroundLightDanger: $euiColorDanger20 !default;
$euiColorBackgroundLightText: $euiColorShade20 !default;
$euiColorBackgroundFilledPrimary: $euiColorPrimary90 !default;
$euiColorBackgroundFilledAccent: $euiColorAccent90 !default;
$euiColorBackgroundFilledAccentSecondary: $euiColorAccentSecondary90 !default;
$euiColorBackgroundFilledNeutral: $euiColorNeutral80 !default;
$euiColorBackgroundFilledSuccess: $euiColorSuccess90 !default;
$euiColorBackgroundFilledWarning: $euiColorWarning40 !default;
$euiColorBackgroundFilledRisk: $euiColorRisk70 !default;
$euiColorBackgroundFilledDanger: $euiColorDanger90 !default;
$euiColorBackgroundFilledText: $euiColorShade90 !default;
$euiTextColor: $euiColorShade130 !default;
$euiTitleColor: $euiColorShade140 !default;
$euiTextSubduedColor: $euiColorShade95 !default;
$euiColorDisabled: $euiColorBackgroundBaseDisabled !default;
$euiColorDisabledText: $euiColorShade70 !default;
$euiLinkColor: $euiColorPrimary100 !default;
$euiColorTextParagraph: $euiColorShade130 !default;
$euiColorTextHeading: $euiColorShade140 !default;
$euiColorTextSubdued: $euiColorShade95 !default;
$euiColorTextDisabled: $euiColorShade70 !default;
$euiColorTextInverse: $euiColorPlainLight !default;
$euiColorPrimaryText: $euiColorPrimary100 !default;
$euiColorAccentText: $euiColorAccent100 !default;
$euiColorSuccessText: $euiColorSuccess100 !default;
$euiColorWarningText: $euiColorWarning100 !default;
$euiColorDangerText: $euiColorDanger100 !default;
$euiColorTextPrimary: $euiColorPrimary100 !default;
$euiColorTextAccent: $euiColorAccent100 !default;
$euiColorTextAccentSecondary: $euiColorAccentSecondary100 !default;
$euiColorTextNeutral: $euiColorNeutral100 !default;
$euiColorTextSuccess: $euiColorSuccess100 !default;
$euiColorTextWarning: $euiColorWarning100 !default;
$euiColorTextRisk: $euiColorRisk100 !default;
$euiColorTextDanger: $euiColorDanger100 !default;
$euiColorBorderBasePrimary: $euiColorPrimary30 !default;
$euiColorBorderBaseAccent: $euiColorAccent30 !default;
$euiColorBorderBaseAccentSecondary: $euiColorAccentSecondary30 !default;
$euiColorBorderBaseNeutral: $euiColorNeutral30 !default;
$euiColorBorderBaseSuccess: $euiColorSuccess30 !default;
$euiColorBorderBaseWarning: $euiColorWarning30 !default;
$euiColorBorderBaseRisk: $euiColorRisk30 !default;
$euiColorBorderBaseDanger: $euiColorDanger30 !default;
$euiColorBorderBasePlain: $euiColorShade30 !default;
$euiColorBorderBaseSubdued: $euiColorShade20 !default;
$euiColorBorderBaseProminent: $euiColorShade50 !default;
$euiColorBorderBaseDisabled: $euiColorShade30 !default;
$euiColorBorderBaseFloating: $euiColorTransparent !default;
$euiColorBorderBaseFormsColorSwatch: $euiColorShade100Alpha24 !default;
$euiColorBorderInteractiveFormsHoverPlain: $euiColorShade40 !default;
$euiColorBorderInteractiveFormsHoverProminent: $euiColorShade70 !default;
$euiColorBorderInteractiveFormsHoverDanger: $euiColorDanger80 !default;
$euiColorBorderStrongPrimary: $euiColorPrimary90 !default;
$euiColorBorderStrongAccent: $euiColorAccent90 !default;
$euiColorBorderStrongAccentSecondary: $euiColorAccentSecondary90 !default;
$euiColorBorderStrongNeutral: $euiColorNeutral90 !default;
$euiColorBorderStrongSuccess: $euiColorSuccess90 !default;
$euiColorBorderStrongWarning: $euiColorWarning90 !default;
$euiColorBorderStrongRisk: $euiColorRisk90 !default;
$euiColorBorderStrongDanger: $euiColorDanger90 !default;
$euiColorBorderStrongText: $euiColorShade90 !default;
$euiColorChartLines: $euiColorShade30 !default;
$euiColorChartBand: $euiColorShade10 !default;

// 5. Import visualization colors
@import "${euiThemeBorealis.replace(/\\/g, '/')}/variables/colors/colors_vis";
@import "${euiThemeBorealis.replace(/\\/g, '/')}/variables/colors/colors_vis_light";

// 6. Import shadows
@import "${euiThemeBorealis.replace(/\\/g, '/')}/variables/shadows_light";

// 7. Import the remaining borealis variables (avoiding _index.scss which has problematic imports)
@import "${euiThemeBorealis.replace(/\\/g, '/')}/variables/borders";
@import "${euiThemeBorealis.replace(/\\/g, '/')}/variables/states";
@import "${euiThemeBorealis.replace(/\\/g, '/')}/variables/colors/colors_severity";
@import "${euiThemeBorealis.replace(/\\/g, '/')}/variables/form";
@import "${euiThemeBorealis.replace(/\\/g, '/')}/variables/page";
@import "${euiThemeBorealis.replace(/\\/g, '/')}/variables/font_weight";
@import "${euiThemeBorealis.replace(/\\/g, '/')}/variables/typography";

// 8. Import mixins
@import "${euiThemeBorealis.replace(/\\/g, '/')}/mixins/index";

// 9. Import remaining common global_styling (avoiding global_styling/index which includes variables)
@import "${euiThemeCommon.replace(/\\/g, '/')}/global_styling/variables/index";
@import "${euiThemeCommon.replace(/\\/g, '/')}/global_styling/mixins/index";

$kbnThemeVersion: 'borealislight';
`;

      // Add CSS/SCSS configuration
      const config = {
        css: {
          preprocessorOptions: {
            scss: {
              // Use modern-compiler API with sass-embedded
              api: 'modern-compiler',
              // Load paths for SCSS resolution
              loadPaths: [
                repoRoot,
                nodeModulesPath,
                Path.resolve(nodeModulesPath, '@elastic/eui-theme-borealis'),
                Path.resolve(nodeModulesPath, '@elastic/eui-theme-common'),
              ],
              // Suppress deprecation warnings from EUI's SCSS
              silenceDeprecations: [
                'color-functions',
                'import',
                'global-builtin',
                'legacy-js-api',
                'slash-div',
              ],
              // Output style based on environment
              style: isProduction ? 'compressed' : 'expanded',
              // Prepend EUI theme imports
              additionalData,
            },
          },
          // Enable source maps in development
          devSourcemap: !isProduction,
        },
      };

      return config as UserConfig;
    },
  };
}

/**
 * Plugin that handles .peggy grammar files (Peggy parser generator).
 * This is the Vite equivalent of @kbn/peggy-loader.
 */
export function kbnPeggyPlugin(): Plugin {
  return {
    name: 'kbn-peggy',

    async transform(code, id) {
      if (!id.endsWith('.peggy')) {
        return null;
      }

      // Dynamic import to avoid bundling peggy in the plugin
      const peggyModule = await import('peggy');
      // Handle ES module default export
      const peggy = (peggyModule as any).default || peggyModule;

      // Try to load config from .peggy.config.json file
      let peggyOptions: Record<string, unknown> = {};
      const configPath = `${id}.config.json`;
      try {
        const fsModule = await import('fs');
        const fs = fsModule.default || fsModule;
        if (fs.existsSync(configPath)) {
          const configContent = fs.readFileSync(configPath, 'utf-8');
          peggyOptions = JSON.parse(configContent);
        }
      } catch {
        // Config file is optional, ignore errors
      }

      try {
        // Generate parser code with merged options
        const parserSource = peggy.generate(code, {
          output: 'source',
          format: 'es',
          ...peggyOptions,
        });

        return {
          code: parserSource,
          map: null,
        };
      } catch (error) {
        this.error(`Failed to compile Peggy grammar ${id}: ${error}`);
        return null;
      }
    },
  };
}

/**
 * Plugin that handles .text files (raw text imports).
 * This is the Vite equivalent of @kbn/dot-text-loader.
 */
export function kbnDotTextPlugin(): Plugin {
  return {
    name: 'kbn-dot-text',

    transform(code, id) {
      if (!id.endsWith('.text')) {
        return null;
      }

      // Export the text content as a default export
      return {
        code: `export default ${JSON.stringify(code)};`,
        map: null,
      };
    },
  };
}

/**
 * Plugin that handles raw file imports via ?raw query parameter.
 * This is similar to webpack's raw-loader.
 */
export function kbnRawPlugin(): Plugin {
  return {
    name: 'kbn-raw',

    transform(code, id) {
      // Handle ?raw query parameter
      if (id.includes('?raw')) {
        return {
          code: `export default ${JSON.stringify(code)};`,
          map: null,
        };
      }

      // Handle common text file extensions
      if (/\.(html|md|txt|tmpl)$/.test(id)) {
        return {
          code: `export default ${JSON.stringify(code)};`,
          map: null,
        };
      }

      return null;
    },
  };
}
