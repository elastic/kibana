/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
