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

const Lint = require('tslint');

const FAILURE_STRING = 'File must start with a license header';
const RULE_NAME = 'require-license-header';

exports.Rule = class extends Lint.Rules.AbstractRule {
  apply(sourceFile) {
    const [headerText] = this.getOptions().ruleArguments;

    if (!headerText) {
      throw new Error(`${RULE_NAME} requires a single argument containing the header text`);
    }

    if (sourceFile.text.startsWith(headerText)) {
      return [];
    }

    return [
      new Lint.RuleFailure(
        sourceFile,
        0,
        0,
        FAILURE_STRING,
        RULE_NAME,
        new Lint.Replacement(0, 0, `${headerText}\n\n`)
      )
    ];
  }
};
