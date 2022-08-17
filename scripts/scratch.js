/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

var Fs = require('fs');
var Path = require('path');

var repoRoot = require('@kbn/utils').REPO_ROOT;
var Jsonc = require('@kbn/jsonc');
var discover = require('@kbn/bazel-packages').discoverBazelPackages;

discover().then(function (pkgs) {
  for (var pkg of pkgs) {
    // var pkgJson = Path.resolve(repoRoot, pkg.normalizedRepoRelativeDir, 'package.json');
    var manifest = Path.resolve(repoRoot, pkg.normalizedRepoRelativeDir, 'kibana.jsonc');

    Fs.writeFileSync(
      manifest,
      JSON.stringify(Jsonc.parse(Fs.readFileSync(manifest, 'utf8')), null, 2)
    );
  }
});
