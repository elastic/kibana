/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

var Fs = require('fs');
var Path = require('path');
var globby = require('globby');
var Cp = require('child_process');
var REPO_ROOT = require('@kbn/utils').REPO_ROOT;
var getAllBazelPackageDirs = require('@kbn/bazel-packages').getAllBazelPackageDirs;

var MAN_SHA = '36e989a9f7fc3072955b97f4a49334ee9e307531';

var AUTHOR_TRANSLATIONS = new Map([['Kibana Core', '@elastic/kibana-core']]);

var MAN_OWNERS = new Map([[]]);

for (var dir of getAllBazelPackageDirs(REPO_ROOT)) {
  var pkgs = globby.sync('*/package.json', {
    cwd: dir,
    absolute: true,
    onlyFiles: true,
  });

  for (var pkgPath of pkgs) {
    /** @type {Record<string, unknown>} */
    var pkgJson = Fs.readFileSync(pkgPath, 'utf8');
    var pkg = JSON.parse(pkgJson);
    var manifestPath = Path.resolve(Path.dirname(pkgPath), 'kibana.jsonc');
    var rel = Path.relative(REPO_ROOT, manifestPath);

    var manualManifest;
    try {
      manualManifest = JSON.parse(
        Cp.execFileSync('git', ['cat-file', '-p', `${MAN_SHA}:${rel}`], {
          cwd: REPO_ROOT,
        })
      );
    } catch (error) {
      if (error.message.includes(`'${rel}' does not exist in '${MAN_SHA}'`)) {
        manualManifest = undefined;
      } else {
        throw error;
      }
    }

    var owner = manualManifest?.owner ?? MAN_OWNERS.get(rel) ?? AUTHOR_TRANSLATIONS.get(pkg.author);
    if (!owner) {
      throw new Error(`missing owner for [${rel}]`);
    }

    Fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          type: 'shared-common',
          id: pkg.name,
          devOnly: pkg?.kibana?.devOnly ? true : undefined,
          owner,
          runtimeDeps: [],
          typeDeps: [],
        },
        null,
        2
      ) + '\n'
    );

    Fs.writeFileSync(
      pkgPath,
      JSON.stringify(
        Object.assign(pkg, {
          kibana: undefined,
        }),
        null,
        2
      ) + (pkgJson.endsWith('\n') ? '\n' : '')
    );
  }
}
