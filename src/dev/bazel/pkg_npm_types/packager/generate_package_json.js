/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const fs = require('fs');
const Mustache = require('mustache');
const path = require('path');

function generatePackageJson(outputBasePath, packageJsonTemplatePath, rawPackageJsonTemplateArgs) {
  const packageJsonTemplateArgsInTuples = rawPackageJsonTemplateArgs.reduce(
    (a, v) => {
      const lastTupleIdx = a.length - 1;
      const lastTupleSize = a[lastTupleIdx].length;

      if (lastTupleSize < 2) {
        a[lastTupleIdx].push(v);

        return a;
      }

      return a.push([v]);
    },
    [[]]
  );
  const packageJsonTemplateArgs = Object.fromEntries(new Map(packageJsonTemplateArgsInTuples));

  try {
    const template = fs.readFileSync(packageJsonTemplatePath);
    const renderedTemplate = Mustache.render(template.toString(), packageJsonTemplateArgs);
    fs.writeFileSync(path.resolve(outputBasePath, 'package.json'), renderedTemplate);
  } catch (e) {
    console.error(e);
    return 1;
  }

  return 0;
}

module.exports.generatePackageJson = generatePackageJson;
