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

const Path = require('path');
const { readFileSync } = require('fs');
const t = require('babel-types');

// we have to determine the root of the Kibana repo to properly resolve imports
// and since this package runs from source, and from the node_modules directory
// we are breaking the rules and embedding that info here.
const KIBANA_PACKAGE_JSON = __dirname.includes('node_modules')
  ? Path.resolve(__dirname, '../../../../package.json')
  : Path.resolve(__dirname, '../../../package.json');

try {
  const pkg = JSON.parse(readFileSync(KIBANA_PACKAGE_JSON, 'utf8'));
  if (pkg.name !== 'kibana') {
    throw true;
  }
} catch (error) {
  throw new Error(`
    Unable to determine absolute path to Kibana repo, @kbn/babel-preset expects to either run
    from the packages/ directory in source, or from the root of the node_modules directory
    in the distributable.
  `);
}

const REPO_ROOT = Path.dirname(KIBANA_PACKAGE_JSON);

module.exports = () => ({
  name: '@kbn/babel-preset/transform/rewrite_absolute_imports',
  visitor: {
    ImportDeclaration(path) {
      const source = path.get('source');
      const importPath = t.isStringLiteral(source.node) && source.node.value;

      if (!importPath || !(importPath.startsWith('src/') || importPath.startsWith('x-pack/'))) {
        return;
      }

      const { root, sourceFileName, filename } = path.hub.file.opts;

      let absPath;
      if (sourceFileName && Path.isAbsolute(sourceFileName)) {
        absPath = sourceFileName;
      } else if (filename && Path.isAbsolute(filename)) {
        absPath = filename;
      } else if (!absPath && root) {
        absPath = Path.resolve(root, sourceFileName || filename);
      } else {
        throw new Error(`
          Unable to determine absolute path of file, either sourceFileName or filename opt
          must be defined for the file and be absolute or combined with the root file opt.
        `);
      }

      const targetPath = Path.resolve(REPO_ROOT, source.node.value);
      source.replaceWith(t.stringLiteral(Path.relative(Path.dirname(absPath), targetPath)));
    }
  }
});
