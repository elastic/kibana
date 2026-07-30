/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Crypto = require('crypto');
const Fs = require('fs');
const Path = require('path');
const { createTransformer } = require('@swc/jest');
const { getJestSwcConfig } = require('@kbn/swc-config/jest');
const babelTransformer = require('../babel');

const THIS_FILE = Fs.readFileSync(__filename);
const SWC_CORE_VERSION = require('@swc/core').version;
const SWC_JEST_VERSION = require('@swc/jest/package.json').version;
const EMOTION_PLUGIN_VERSION = require('@swc/plugin-emotion/package.json').version;

const swcTransformers = new Map(
  ['.js', '.mjs', '.ts', '.tsx'].map((extension) => [
    extension,
    createTransformer(getJestSwcConfig(`/__kbn_jest_transformer__${extension}`)),
  ])
);

function getSwcTransformer(sourcePath) {
  return swcTransformers.get(Path.extname(sourcePath)) ?? swcTransformers.get('.js');
}

const REQUIRES_BABEL_JEST_HOIST =
  /\bjest\s*\.\s*(?:disableAutomock|enableAutomock|mock|unmock)\s*\(/;

function requiresBabelJestHoist(sourceText) {
  return REQUIRES_BABEL_JEST_HOIST.test(sourceText);
}

function inlineDynamicJestMockNames(sourceText) {
  const moduleNames = new Map();
  const moduleNameDeclaration =
    /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*((?:'[^'\r\n]*'|"[^"\r\n]*"|`[^`$\r\n]*`))\s*;/g;

  for (const match of sourceText.matchAll(moduleNameDeclaration)) {
    moduleNames.set(match[1], match[2]);
  }

  if (moduleNames.size === 0) {
    return sourceText;
  }

  return sourceText.replace(
    /\bjest(\s*)\.(\s*)mock(\s*\(\s*)([A-Za-z_$][\w$]*)(\s*,)/g,
    (match, beforeDot, afterDot, callStart, moduleName, comma) => {
      const modulePath = moduleNames.get(moduleName);
      return modulePath
        ? `jest${beforeDot}.${afterDot}mock${callStart}${modulePath}${comma}`
        : match;
    }
  );
}

// lazyObject is still implemented as a Babel macro. Keep this narrow fallback until the
// macro has an SWC implementation or can be replaced by a runtime API.
function requiresLazyObjectTransform(sourceText) {
  return sourceText.includes('@kbn/lazy-object') && /\blazyObject\s*\(/.test(sourceText);
}

// SWC treats enum members initialized from string constants as numeric members and emits a
// reverse mapping. Babel preserves the string-enum behavior expected from TypeScript.
function requiresComputedEnumTransform(sourceText) {
  return /\benum\s+[A-Za-z_$][\w$]*\s*\{[^}]*?=\s*[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?\s*[,}]/.test(
    sourceText
  );
}

function requiresBabelTransform(sourceText) {
  return (
    requiresLazyObjectTransform(sourceText) ||
    requiresComputedEnumTransform(sourceText) ||
    requiresBabelJestHoist(sourceText)
  );
}

function getUninstrumentedOptions(transformOptions) {
  return transformOptions?.instrument
    ? {
        ...transformOptions,
        instrument: false,
      }
    : transformOptions;
}

function makeExportsConfigurable(result, transformOptions) {
  if (!result?.code || transformOptions?.supportsStaticESM) {
    return result;
  }

  // SWC emits live named exports as non-configurable getters. Jest spies replace export
  // properties, so keep the getters but match Babel's configurable export contract.
  const code = result.code.replace(
    /(Object\.defineProperty\((exports|target|to),\s*((?:(?:\/\*[\s\S]*?\*\/|\/\/[^\r\n]*(?:\r?\n|$)|\s))*(?:["'][^"']+["']|[A-Za-z_$][\w$]*)),\s*\{\s*\n)(\s*)enumerable: true,/g,
    (_match, prefix, target, property, indentation) =>
      `${prefix}${indentation}enumerable: true, configurable: true,\n` +
      `${indentation}set: ((exportTarget, exportName) => function(value) { ` +
      `Object.defineProperty(exportTarget, exportName, ` +
      `{ value, writable: true, enumerable: true, configurable: true }); ` +
      `})(${target}, ${property}),`
  );

  return code === result.code ? result : { ...result, code };
}

function makeExportsTdzSafe(result, transformOptions) {
  if (!result?.code || transformOptions?.supportsStaticESM) {
    return result;
  }

  // Babel initializes CommonJS export slots to undefined before loading dependencies. SWC
  // exposes live getters instead, which can throw when a circular dependency observes a local
  // const before initialization. Preserve live bindings while matching Babel during the cycle.
  const code = result.code
    .replace(
      /get: Object\.getOwnPropertyDescriptor\(all, name\)\.get/g,
      `get: ((getter) => function() {
            try {
                return getter();
            } catch (error) {
                if (error instanceof ReferenceError) return undefined;
                throw error;
            }
        })(Object.getOwnPropertyDescriptor(all, name).get)`
    )
    .replace(
      /get: function\(\) \{\n(\s*)return ([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*);\n\s*\}/g,
      `get: function() {
$1try {
$1    return $2;
$1} catch (error) {
$1    if (error instanceof ReferenceError) return undefined;
$1    throw error;
$1}
$1}`
    );

  return code === result.code ? result : { ...result, code };
}

function makeLocalExportsWritable(result, transformOptions) {
  if (!result?.code || transformOptions?.supportsStaticESM) {
    return result;
  }

  const exportsToMaterialize = new Set();
  const localExport = /get\s+([A-Za-z_$][\w$]*)\s*\(\)\s*\{\s*return\s+([A-Za-z_$][\w$]*);\s*\}/g;
  const explicitLocalExport =
    /Object\.defineProperty\(exports,\s*(?:(?:\/\*[\s\S]*?\*\/|\/\/[^\r\n]*(?:\r?\n|$))\s*)*["']([^"']+)["'],(?:(?!Object\.defineProperty\()[\s\S])*?get:\s*function\(\)\s*\{\s*return\s+([A-Za-z_$][\w$]*);\s*\}/g;

  for (const match of [
    ...result.code.matchAll(localExport),
    ...result.code.matchAll(explicitLocalExport),
  ]) {
    const [, exportName, localName] = match;
    const stableDeclaration = new RegExp(
      `(?:const\\s+${localName}\\b|function\\s+${localName}\\b|class\\s+${localName}\\b)`
    );

    if (
      exportName !== '__esModule' &&
      exportName !== 'default' &&
      stableDeclaration.test(result.code)
    ) {
      exportsToMaterialize.add(exportName);
    }
  }

  if (exportsToMaterialize.size === 0) {
    return result;
  }

  // SWC uses accessor exports to preserve ESM live bindings. Once immutable local exports have
  // initialized, expose them as writable data properties to match Babel's CommonJS contract and
  // allow Jest and Sinon to replace them. Mutable and re-exported bindings remain accessors.
  const statements = [...exportsToMaterialize]
    .map(
      (exportName) =>
        `Object.defineProperty(exports, ${JSON.stringify(exportName)}, ` +
        `{ value: exports[${JSON.stringify(
          exportName
        )}], writable: true, enumerable: true, configurable: true });`
    )
    .join('\n');
  const sourceMapIndex = result.code.lastIndexOf('\n//# sourceMappingURL=');
  const code =
    sourceMapIndex === -1
      ? `${result.code}\n${statements}`
      : `${result.code.slice(0, sourceMapIndex)}\n${statements}${result.code.slice(
          sourceMapIndex
        )}`;

  return { ...result, code };
}

function stripSourceMapNames(result) {
  if (!result?.map || typeof result.map !== 'string') {
    return result;
  }

  const sourceMap = JSON.parse(result.map);
  if (!Array.isArray(sourceMap.names) || sourceMap.names.length === 0) {
    return result;
  }

  const base64Characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const mappings = sourceMap.mappings.replace(/[^,;]+/g, (segment) => {
    let index = 0;
    let field = 0;

    while (index < segment.length) {
      field += 1;
      if (field === 5) {
        return segment.slice(0, index);
      }

      let digit;
      do {
        digit = base64Characters.indexOf(segment[index]);
        index += 1;
      } while (digit >= 0 && (digit & 32) !== 0);
    }

    return segment;
  });

  return {
    ...result,
    map: JSON.stringify({ ...sourceMap, names: [], mappings }),
  };
}

function applyCommonJsCompatibility(result, transformOptions) {
  const compatibleResult = addModuleExportsCompatibility(
    makeExportsConfigurable(
      makeExportsTdzSafe(makeLocalExportsWritable(result, transformOptions), transformOptions),
      transformOptions
    ),
    transformOptions
  );

  // SWC name mappings can associate a React component frame with a nested callback. Keep the
  // original source locations while allowing V8 to report the generated function's actual name.
  return stripSourceMapNames(compatibleResult);
}

function addModuleExportsCompatibility(result, transformOptions) {
  if (!result?.code || transformOptions?.supportsStaticESM) {
    return result;
  }

  // The previous Babel pipeline exposed a sole default export directly through
  // module.exports. Preserve that behavior for CommonJS require() consumers.
  const exportNames = new Set();
  const exportPattern =
    /(?:exports\.([A-Za-z_$][\w$]*)\s*=|Object\.defineProperty\(exports,\s*(?:(?:\/\*[\s\S]*?\*\/|\/\/[^\r\n]*(?:\r?\n|$))\s*)*["']([^"']+)["'])/g;

  for (const match of result.code.matchAll(exportPattern)) {
    exportNames.add(match[1] ?? match[2]);
  }

  exportNames.delete('__esModule');

  if (
    !exportNames.has('default') ||
    exportNames.size !== 1 ||
    result.code.includes('@swc/helpers/_/_export_star') ||
    result.code.includes('function _export_star(')
  ) {
    return result;
  }

  const sourceMapIndex = result.code.lastIndexOf('\n//# sourceMappingURL=');
  const compatibilityStatement = '\nmodule.exports = exports.default;';
  const code =
    sourceMapIndex === -1
      ? `${result.code}${compatibilityStatement}`
      : `${result.code.slice(0, sourceMapIndex)}${compatibilityStatement}${result.code.slice(
          sourceMapIndex
        )}`;

  return { ...result, code };
}

function serializeJestTransformConfig(config) {
  const transform = Object.fromEntries(
    Object.entries(config?.transform ?? {})
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([pattern, value]) => [
        pattern,
        Array.isArray(value) ? [String(value[0]), value[1] ?? null] : String(value),
      ])
  );
  const transformIgnorePatterns = (config?.transformIgnorePatterns ?? []).map(String);

  return JSON.stringify({ transform, transformIgnorePatterns });
}

const transformer = {
  canInstrument: false,

  process(sourceText, sourcePath, transformOptions) {
    if (requiresBabelTransform(sourceText)) {
      const result = babelTransformer.process(
        inlineDynamicJestMockNames(sourceText),
        sourcePath,
        getUninstrumentedOptions(transformOptions)
      );
      return makeExportsConfigurable(result, transformOptions);
    }

    const result = getSwcTransformer(sourcePath).process(sourceText, sourcePath, transformOptions);
    return applyCommonJsCompatibility(result, transformOptions);
  },

  async processAsync(sourceText, sourcePath, transformOptions) {
    if (requiresBabelTransform(sourceText)) {
      const result = await babelTransformer.processAsync(
        inlineDynamicJestMockNames(sourceText),
        sourcePath,
        getUninstrumentedOptions(transformOptions)
      );
      return makeExportsConfigurable(result, transformOptions);
    }

    const result = await getSwcTransformer(sourcePath).processAsync(
      sourceText,
      sourcePath,
      transformOptions
    );
    return applyCommonJsCompatibility(result, transformOptions);
  },

  getCacheKey(sourceText, sourcePath, transformOptions) {
    const config = transformOptions?.config ?? {};
    const rootDir = Path.resolve(config.rootDir ?? process.cwd());
    const hash = Crypto.createHash('sha256');

    hash.update(THIS_FILE);
    hash.update('\0');
    hash.update(SWC_CORE_VERSION);
    hash.update('\0');
    hash.update(SWC_JEST_VERSION);
    hash.update('\0');
    hash.update(EMOTION_PLUGIN_VERSION);
    hash.update('\0');
    hash.update(JSON.stringify(getJestSwcConfig(sourcePath)));
    hash.update('\0');
    hash.update(serializeJestTransformConfig(config));
    hash.update('\0');
    hash.update(rootDir);
    hash.update('\0');
    hash.update(Path.relative(rootDir, Path.resolve(sourcePath)));
    hash.update('\0');
    hash.update(transformOptions?.instrument ? 'instrument' : 'no-instrument');
    hash.update('\0');
    hash.update(transformOptions?.supportsStaticESM ? 'esm' : 'commonjs');
    hash.update('\0');
    hash.update(process.env.NODE_ENV ?? '');
    hash.update('\0');
    hash.update(process.version);
    hash.update('\0');
    hash.update(sourceText);

    if (requiresBabelTransform(sourceText)) {
      hash.update('\0babel-compatibility\0');
      hash.update(
        babelTransformer.getCacheKey(sourceText, sourcePath, transformOptions).toString()
      );
    }

    return hash.digest('hex').slice(0, 32);
  },
};

module.exports = transformer;
