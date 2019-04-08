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

const path = require('path');
const Lint = require('tslint');

const KIBANA_ROOT = path.resolve(__dirname, '../../../..');

class ModuleMigrationWalker extends Lint.RuleWalker {
  visitImportDeclaration(node) {
    const moduleId = node.moduleSpecifier.text;
    const mapping = this.options.find(
      mapping => mapping.from === moduleId || moduleId.startsWith(`${mapping.from}/`)
    );

    if (!mapping) {
      return;
    }

    let newSource;

    // support for toRelative added to migrate away from X-Pack being bundled
    // within node modules. after that migration, this can be removed.
    if (mapping.toRelative) {
      const sourceDirectory = path.dirname(this.getSourceFile().originalFileName);
      const localModulePath = moduleId.replace(new RegExp(`^${mapping.from}\/`), '');
      const modulePath = path.resolve(KIBANA_ROOT, mapping.toRelative, localModulePath);
      const relativePath = path.relative(sourceDirectory, modulePath);

      newSource = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
    } else {
      newSource = moduleId.replace(mapping.from, mapping.to);
    }

    const start = node.moduleSpecifier.getStart();
    const width = node.moduleSpecifier.getWidth();

    this.addFailure(
      this.createFailure(
        start,
        width,
        `Imported module "${moduleId}" should be "${newSource}"`,
        this.createReplacement(
          start,
          width,
          `'${newSource}'`
        )
      )
    );

    super.visitImportDeclaration(node);
  }
}

exports.Rule = class extends Lint.Rules.AbstractRule {
  apply(sourceFile) {
    return this.applyWithWalker(new ModuleMigrationWalker(sourceFile, this.getOptions()));
  }
};
