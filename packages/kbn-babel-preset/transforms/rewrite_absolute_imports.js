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

const t = require('babel-types');

module.exports = () => ({
  name: '@kbn/babel-preset/transform/rewrite_absolute_imports',
  visitor: {
    ImportDeclaration(path) {
      const source = path.get('source');
      const importPath = t.isStringLiteral(source.node) && source.node.value;

      if (!importPath || !(importPath.startsWith('src/') || importPath.startsWith('x-pack/'))) {
        return;
      }

      if (!path.hub.file.opts.root) {
        throw new Error(`Missing 'root' option, required to implement rewrite_absolute_imports transform`);
      }

      if (!path.hub.file.opts.sourceFileName && !path.hub.file.opts.filename) {
        throw new Error('Missing either `filename` or `sourceFileName`, required to implement rewrite_absolute_imports transform');
      }

      const absPath = Path.resolve(path.hub.file.opts.root, path.hub.file.opts.sourceFileName || path.hub.file.opts.filename);
      const targetPath = Path.resolve(path.hub.file.opts.root, source.node.value);
      source.replaceWith(t.stringLiteral(Path.relative(Path.dirname(absPath), targetPath)));
    }
  }
});
