/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { stringifyRequest, getOptions } from 'loader-utils';
import webpack from 'webpack';
import PostCss from 'postcss';
import NodeSass from 'node-sass';

import { parseThemeTags, ALL_THEMES, ThemeTag, ThemeTags } from '../common';
// @ts-expect-error required to be JS by other tools consuming it
import postCssConfig from '../../postcss.config.js';

const IS_NATIVE_WIN32_PATH = /^[a-z]:[/\\]|^\\\\/i;
const ABSOLUTE_SCHEME = /^[A-Za-z0-9+\-.]+:/;

interface LoaderOptions {
  dist: boolean;
  repoRoot: string;
  sourceMapRoot: string;
  themeTags: ThemeTags;
}

function parseOptions(ctx: webpack.loader.LoaderContext): LoaderOptions {
  const raw = getOptions(ctx);

  return {
    dist: raw.dist,
    repoRoot: raw.repoRoot,
    sourceMapRoot: raw.sourceMapRoot,
    themeTags: parseThemeTags(raw.themeTags),
  };
}

/**
 * @param {string} source
 * @returns {"absolute" | "scheme-relative" | "path-absolute" | "path-absolute"}
 */
function getURLType(source: string) {
  if (source[0] === '/') {
    if (source[1] === '/') {
      return 'scheme-relative' as const;
    }

    return 'path-absolute' as const;
  }

  if (IS_NATIVE_WIN32_PATH.test(source)) {
    return 'path-absolute' as const;
  }

  return ABSOLUTE_SCHEME.test(source) ? ('absolute' as const) : ('path-relative' as const);
}

function normalizeSourceMap(map: Buffer, rootContext: string) {
  const newMap = JSON.parse(map.toString('utf8'));

  // result.map.file is an optional property that provides the output filename.
  // Since we don't know the final filename in the webpack build chain yet, it makes no sense to have it.
  delete newMap.file;

  newMap.sourceRoot = '';

  // node-sass returns POSIX paths, that's why we need to transform them back to native paths.
  // This fixes an error on windows where the source-map module cannot resolve the source maps.
  // @see https://github.com/webpack-contrib/sass-loader/issues/366#issuecomment-279460722
  newMap.sources = newMap.sources.map((source: string) => {
    const sourceType = getURLType(source);

    // Do no touch `scheme-relative`, `path-absolute` and `absolute` types
    if (sourceType === 'path-relative') {
      return Path.resolve(rootContext, Path.normalize(source));
    }

    return source;
  });

  return newMap;
}

const processFile = async ({
  css,
  ctx,
  options,
}: {
  css: string;
  ctx: webpack.loader.LoaderContext;
  options: LoaderOptions;
}) => {
  // process the code with node-sass, which needs to be limited in concurrency
  const nodeSassResult = await new Promise<NodeSass.Result>((resolve, reject) => {
    NodeSass.render(
      {
        file: ctx.resourcePath,
        data: css,
        outputStyle: options.dist ? 'compressed' : 'nested',
        includePaths: [Path.resolve(options.repoRoot, 'node_modules')],
        ...(!options.dist
          ? {
              sourceMap: !!options.dist,
              sourceMapRoot: options.sourceMapRoot,
              outFile: Path.join(ctx.rootContext, 'style.css.map'),
              sourceMapContents: true,
              omitSourceMapUrl: true,
              sourceMapEmbed: false,
            }
          : {}),
      },
      (error, result) => {
        if (error) {
          if (error.file) {
            ctx.addDependency(Path.normalize(error.file));
          }

          reject(error);
        } else {
          resolve(result);
        }
      }
    );
  });

  for (const file of nodeSassResult.stats.includedFiles) {
    const normal = Path.normalize(file);
    if (Path.isAbsolute(normal)) {
      ctx.addDependency(normal);
    }
  }

  // process the node-sass result with post-css
  const postCssResult = await PostCss(postCssConfig.plugins).process(
    nodeSassResult.css.toString(),
    {
      map: nodeSassResult.map
        ? {
            prev: normalizeSourceMap(nodeSassResult.map, ctx.rootContext),
            inline: false,
            annotation: false,
          }
        : false,
      from: ctx.resourcePath,
    }
  );

  return {
    css: postCssResult.css,
    map: postCssResult.map ? JSON.stringify(postCssResult.map) : undefined,
  };
};

const asyncLoader = async (ctx: webpack.loader.LoaderContext, css: string) => {
  const options = parseOptions(ctx);

  // process css into results for each active theme
  const processResults: Array<{ tag: ThemeTag; css: string; map: string | undefined }> = [];
  await Promise.all(
    ALL_THEMES.map(async (tag) => {
      if (!options.themeTags.includes(tag)) {
        return;
      }

      processResults.push({
        tag,
        ...(await processFile({
          ctx,
          options,
          css: `@import ${stringifyRequest(
            ctx,
            Path.resolve(options.repoRoot, `src/core/public/core_app/styles/_globals_${tag}.scss`)
          )};\n${css}`,
        })),
      });
    })
  );

  // sort the processResults so that they are in a reliable order and the code is deterministic
  processResults.sort((a, b) => a.tag.localeCompare(b.tag));

  // iterate the processResults and write them to a map, with css/sourceMap properties or a ref
  // to another theme with the same css/sourceMap
  const resultMap: Record<string, string | { ref: string }> = {};
  addResultsToMap: for (const result of processResults) {
    // try to find existing themedVersion with matching css as this result
    for (const [otherTag, otherResult] of Object.entries(resultMap)) {
      if (typeof otherResult !== 'string') {
        // skip refs
        continue;
      }

      if (otherResult === result.css) {
        // setup a ref and go to next result
        resultMap[result.tag] = { ref: otherTag };
        continue addResultsToMap;
      }
    }

    // css is unique, store it in the map
    resultMap[result.tag] = result.css;
  }

  const runtimeImport = stringifyRequest(ctx, require.resolve('./runtime/inject_style'));
  const mapKeys = Object.entries(resultMap).map(([tag, result]) =>
    typeof result !== 'string'
      ? `${tag}: {ref: '${result.ref}'}`
      : `${tag}: \`${result.split('\\').join('\\\\').split('`').join('\\`')}\``
  );

  return `import { injectStyle } from ${runtimeImport};
injectStyle({\n  ${mapKeys.join(',\n  ')}\n});
`;
};

// eslint-disable-next-line import/no-default-export
export default async function (this: webpack.loader.LoaderContext, content: string) {
  this.cacheable(true);
  const cb = this.async()!;

  asyncLoader(this, content).then(
    (js) => cb(undefined, js),
    (error) => cb(error)
  );
}
