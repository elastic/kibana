/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { licenseHeader, supportedContexts } = require('../constants');

const toCamelcase = (string) => {
  return string.replace(/([_][a-z])/gi, (match) => {
    return match.toUpperCase().replace('_', '');
  });
};

const createAutocompleteExports = () => {
  const imports = supportedContexts.reduce((importList, context) => {
    const importStatement = `
import * as ${toCamelcase(context)}Context from './${context}.json';`;
    importList = `${importStatement}${importList}`;
    return importList;
  }, '');

  const exports = supportedContexts.reduce((exportList, context) => {
    const exportStatement = `
export { ${toCamelcase(context)}Context };`;
    exportList = `${exportStatement}${exportList}`;
    return exportList;
  }, '');

  const doNotEditComment = `// DO NOT EDIT: THIS FILE CONTAINS GENERATED CODE. REFER TO THE PAINLESS README FOR MORE INFORMATION.`;

  return `${licenseHeader}${doNotEditComment}${imports}${exports}
`;
};

module.exports = createAutocompleteExports;
