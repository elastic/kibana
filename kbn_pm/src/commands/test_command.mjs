/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Path from 'path';

import { REPO_ROOT } from '../lib/paths.mjs';
import { pluginDiscovery } from './bootstrap/plugins.mjs';

const RULE_DEPS = /([\s\n]deps\s*=\s*)((?:\w+(?: \+ )?)?(?:\[[^\]]*\])?)(\s*,|\s*\))/;

/**
 * @param {string} text
 * @param {number} index
 */
function findStartOfLine(text, index) {
  let cursor = index;
  while (cursor > 0) {
    if (text[cursor - 1] === '\n') {
      return cursor;
    }
    cursor -= 1;
  }

  return cursor;
}

/**
 * @param {string} starlark
 * @param {string} name
 */
function findBazelRule(starlark, name) {
  const match = starlark.match(new RegExp(`name\\s*=\\s*${name}`));
  if (typeof match?.index !== 'number') {
    throw new Error(`unable to find rule named [${name}]`);
  }

  const openParen = starlark.slice(0, match.index).lastIndexOf('(');
  if (openParen === -1) {
    throw new Error(`unable to find opening paren for rule [${name}] [index=${match.index}]`);
  }

  const start = findStartOfLine(starlark, openParen);
  const end = starlark.indexOf(')', start);
  if (end === -1) {
    throw new Error(`unable to find closing parent for rule [${name}] [start=${start}]`);
  }

  const type = starlark.slice(start, starlark.indexOf('(', start)).trim();

  // add 1 so that the "end" chunk starts after the closing )
  return { start, end: end + 1, type };
}

/**
 * @param {string} starlark
 * @param {string} name
 */
function removeBazelRule(starlark, name) {
  const pos = findBazelRule(starlark, name);

  let end = pos.end;

  // slurp up all the newlines directly after the closing )
  while (starlark[end] === '\n') {
    end += 1;
  }

  return starlark.slice(0, pos.start) + starlark.slice(end);
}

/**
 * @param {string} starlark
 * @param {string} dep
 * @returns
 */
function addDep(starlark, dep) {
  const depsMatch = starlark.match(RULE_DEPS);

  if (typeof depsMatch?.index !== 'number') {
    return starlark.replace(/,?[\s\n]*\)[\s\n]*$/, '') + `,\n  deps = [${dep}],\n)`;
  }

  const [, head, value, tail] = depsMatch;

  return (
    starlark.slice(0, depsMatch.index) +
    head +
    (() => {
      const multiline = value.includes('\n');
      const existingArray = value.indexOf(']');
      if (existingArray === -1) {
        return value + ` + [${dep}]`;
      }

      const valHead = value.slice(0, existingArray).replace(/,?\s*$/, ',');
      const valTail = value.slice(existingArray);

      return `${valHead}${multiline ? '\n  ' : ' '}${dep}${multiline ? ',\n' : ''}${valTail}`;
    })() +
    tail +
    starlark.slice(depsMatch.index + depsMatch[0].length)
  );
}

/**
 * @param {string} starlark
 * @param {string} name
 * @param {string} newName
 * @param {(rule: string) => string} mod
 */
function duplicateRule(starlark, name, newName, mod) {
  const origPos = findBazelRule(starlark, name);

  const orig = starlark.slice(origPos.start, origPos.end);

  const withName = orig.replace(
    /^(\s*)name\s*=\s*.*$/m,
    (match, head) => `${head}name = ${newName}${match.endsWith(',') ? ',' : ''}`
  );

  return starlark.slice(0, origPos.end) + `\n\n${mod(withName)}` + starlark.slice(origPos.end);
}

/** @type {import('../lib/command').Command} */
export const command = {
  name: '_test',
  async run({ log }) {
    const updates = { pkgJson: 0, buildBazel: 0, tsconfig: 0, tsconfigRefs: 0 };

    await import('../../../src/setup_node_env/index' + '.js');
    const { PROJECTS } = await import('./projects' + '.js');
    const { discoverBazelPackages } = await import('@kbn/bazel-packages');
    const pkgs = await discoverBazelPackages(REPO_ROOT);
    const plugins = await pluginDiscovery();

    // update package.json files to point to their target_types dir
    const relTypes = './target_types/index.d.ts';
    for (const pkg of pkgs) {
      if (!pkg.hasBuildTypesRule()) {
        log.warning(`not defining "types" for ${pkg.manifest.id} because it doesn't build types`);
        continue;
      }

      const dir = Path.resolve(REPO_ROOT, pkg.normalizedRepoRelativeDir);
      const pkgJsonPath = Path.resolve(dir, 'package.json');

      const pkgJson = Fs.readFileSync(pkgJsonPath, 'utf8');
      const parsed = JSON.parse(pkgJson);

      if (parsed.types === relTypes) {
        continue;
      }

      Fs.writeFileSync(
        pkgJsonPath,
        JSON.stringify(
          {
            ...parsed,
            types: relTypes,
          },
          null,
          2
        ) + (pkgJson.endsWith('\n') ? '\n' : '')
      );

      updates.pkgJson += 1;
    }
    log.success(`updated ${updates.pkgJson} package.json files`);

    // update BUILD.bazel files to not rely on type_summarizer
    for (const pkg of pkgs) {
      if (!pkg.hasBuildTypesRule()) {
        continue;
      }

      const starlark = pkg.buildBazelContent;
      if (typeof starlark !== 'string') {
        throw new Error('missing buildBazelContent');
      }

      const npmTypes = findBazelRule(starlark, '"npm_module_types"');

      if (npmTypes.type === 'alias') {
        log.info(`ignoring npm_module_types rule which is an alias in ${pkg.manifest.id}`);
        continue;
      }

      // remove rules for old npm_module_types
      const withoutOldTypes = removeBazelRule(starlark, '"npm_module_types"');

      // duplicate js_library rule and name npm_module_types rule which adds the ':tsc_types' dep
      const withTypesJsLib = duplicateRule(
        withoutOldTypes,
        'PKG_DIRNAME',
        '"npm_module_types"',
        (newRule) => addDep(newRule, '":tsc_types"')
      );

      const withBuildTypesWrapper =
        removeBazelRule(withTypesJsLib, '"build_types"').trimEnd() +
        `

pkg_npm(
  name = "build_types",
  deps = [":npm_module_types"],
  visibility = ["//visibility:public"],
)
`;

      Fs.writeFileSync(
        Path.resolve(REPO_ROOT, pkg.normalizedRepoRelativeDir, 'BUILD.bazel'),
        withBuildTypesWrapper
      );

      updates.buildBazel += 1;
    }
    log.success(`updated ${updates.buildBazel} BUILD.bazel files`);

    // stop enabling declaration source maps in tsconfig
    for (const pkg of [...pkgs, ...plugins]) {
      const dir =
        'normalizedRepoRelativeDir' in pkg
          ? Path.resolve(REPO_ROOT, pkg.normalizedRepoRelativeDir)
          : pkg.directory;

      let changed;

      const tsconfigPath = Path.resolve(dir, 'tsconfig.json');
      if (Fs.existsSync(tsconfigPath)) {
        const current = Fs.readFileSync(tsconfigPath, 'utf8');
        const next = current.replace(/\n\s*"declarationMap"\s*:.+\n/m, '\n');

        if (current !== next) {
          changed = true;
          Fs.writeFileSync(tsconfigPath, next);
        }
      }

      const buildBazelPath = Path.resolve(dir, 'BUILD.bazel');
      if (Fs.existsSync(buildBazelPath)) {
        const current = Fs.readFileSync(buildBazelPath, 'utf8');
        const next = current.replace(/\n.*\bdeclaration_map\b.*\n/, '\n');
        if (current !== next) {
          changed = true;
          Fs.writeFileSync(buildBazelPath, next);
        }
      }

      if (changed) {
        updates.tsconfig += 1;
      }
    }
    log.success(`dropped declarationMap from ${updates.tsconfig} tsconfig.json files`);

    // rename "references" in plugin tsconfig.json files to "kbn_references"
    for (const project of PROJECTS) {
      const tsconfigJson = Fs.readFileSync(project.tsConfigPath, 'utf8');
      const updated = tsconfigJson.replace('"references"', '"kbn_references"');
      if (updated !== tsconfigJson) {
        Fs.writeFileSync(project.tsConfigPath, updated);
        updates.tsconfigRefs += 1;
      }
    }
    log.success(`updated tsconfig references key in ${updates.tsconfigRefs} tsconfig.json files`);
  },
};
