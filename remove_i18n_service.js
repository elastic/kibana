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

const importDeclaration = {
  type: 'ImportDeclaration',
  source: { type: 'Literal', value: '@kbn/i18n' },
  specifiers: [{ type: 'ImportSpecifier', imported: { type: 'Identifier', name: 'i18n' } }] };

const findParamByName = (func, paramName) =>
  func.value.params.filter(param =>
    param.loc.identifierName === paramName);

const removeI18nFnParams = (source, jscodeshift) => {
  let didChange = false;
  const newSource = jscodeshift(source)
    .find(jscodeshift.Function)
    .filter(func => !!findParamByName(func, 'i18n').length)
    .forEach(function (func) {
      console.log('  removing \'i18n\' param');
      func.value.params = func.value.params.filter(param =>
        param.loc.identifierName !== 'i18n');
      didChange = true;
    })
    .toSource();
  return [didChange, newSource];
};

const addI18nImport = (ast, jscodeshift) => {
  const addImport = ast => {
    const tree = jscodeshift(ast);
    tree.find(jscodeshift.Program)
		  .__paths[0]
		  .value
		  .body
		  .splice(1, 0, importDeclaration);
    return tree;
  };

  const hasI18nImport = !!jscodeshift(ast)
    .find(jscodeshift.ImportDeclaration)
    .filter(imp => imp.value.source.value === '@kbn/i18n').length;

  console.log('  adding \'i18n\' import');
  return hasI18nImport ? jscodeshift(ast) : addImport(ast);
};

const fixI18nCalls = (ast, jscodeshift) => {
  return jscodeshift(ast)
    .find(jscodeshift.CallExpression)
    .filter(call => call.value.callee.name === 'i18n')
    .forEach(call => {
      console.log('found one!');
      console.log(call.value.callee.name);
      call.value.callee.name = 'i18n.translate';
    })
    .toSource();
};

module.exports = function ({ source }, { jscodeshift }) {
  const [didChange, newSourceParams] = removeI18nFnParams(source, jscodeshift);
  if(didChange) {
    const newSourceCalls = fixI18nCalls(newSourceParams, jscodeshift);
    return addI18nImport(newSourceCalls, jscodeshift)
  	  .toSource({ quote: 'single' });
  }
};
