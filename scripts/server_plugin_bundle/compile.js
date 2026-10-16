/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

var rspack = require('@rspack/core');
var config = require('./rspack.config');

rspack(config, function (err, stats) {
  var info;
  if (err) {
    console.error(err);
    process.exit(1);
  }
  info = stats.toJson({ errors: true, warnings: true, assets: true });
  console.log(stats.toString({ colors: false, errors: true, warnings: true }));
  console.log(
    JSON.stringify(
      {
        errors: (info.errors && info.errors.length) || 0,
        warnings: (info.warnings && info.warnings.length) || 0,
        assets: (info.assets || []).map(function (asset) {
          return { name: asset.name, size: asset.size };
        }),
      },
      null,
      2
    )
  );
  process.exit(stats.hasErrors() ? 1 : 0);
});
