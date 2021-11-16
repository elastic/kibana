/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { createApiExtraction } = require('./create_api_extraction');
const { generatePackageJson } = require('./generate_package_json');
const path = require('path');

const DEBUG = false;

if (require.main === module) {
  if (DEBUG) {
    console.error(`
pkg_npm_types packager: running with
  cwd: ${process.cwd()}
  argv:
    ${process.argv.join('\n    ')}
  `);
  }

  // layout args
  const [
    outputBasePath,
    packageJsonTemplatePath,
    stringifiedPackageJsonTemplateArgs,
    tsConfig,
    entryPoint,
  ] = process.argv.slice(2);
  const dtsBundleOutput = path.resolve(outputBasePath, 'index.d.ts');

  // generate pkg json output
  const generatePackageJsonRValue = generatePackageJson(
    outputBasePath,
    packageJsonTemplatePath,
    stringifiedPackageJsonTemplateArgs.split(',')
  );
  // create api extraction output
  const createApiExtractionRValue = createApiExtraction(tsConfig, entryPoint, dtsBundleOutput);

  // setup correct exit code
  process.exitCode = generatePackageJsonRValue || createApiExtractionRValue;
}
