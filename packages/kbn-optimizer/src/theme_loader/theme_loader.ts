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
import { normalizeNodeSassSourceMap } from './normalize_node_sass_source_map';

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
              sourceMap: true,
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
            prev: normalizeNodeSassSourceMap(nodeSassResult.map, ctx.rootContext),
            inline: false,
            annotation: false,
          }
        : false,
      from: ctx.resourcePath,
    }
  );
  ctx.addDependency(Path.normalize(require.resolve('../../postcss.config.js')));

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
    if (!result.map) {
      resultMap[result.tag] = result.css;
    } else {
      const base64Map = Buffer.from(unescape(encodeURIComponent(result.map)), 'utf8').toString(
        'base64'
      );
      const cssWithMap = `${result.css}\n/*# sourceMappingURL=data:application/json;base64,${base64Map} */`;
      resultMap[result.tag] = cssWithMap;
    }
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
