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

import { i18n } from '@kbn/i18n';
import fs from 'fs';
import path from 'path';
import _ from 'lodash';
const grammar = fs.readFileSync(path.resolve(__dirname, '../../../public/chain.peg'), 'utf8');
import PEG from 'pegjs';
const Parser = PEG.generate(grammar);

export default function parseSheet(sheet) {
  return _.map(sheet, function(plot) {
    try {
      return Parser.parse(plot).tree;
    } catch (e) {
      if (e.expected) {
        throw new Error(
          i18n.translate('timelion.serverSideErrors.sheetParseErrorMessage', {
            defaultMessage: 'Expected: {expectedDescription} at character {column}',
            description: 'This would be for example: "Expected: a quote at character 5"',
            values: {
              expectedDescription: e.expected[0].description,
              column: e.column,
            },
          })
        );
      } else {
        throw e;
      }
    }
  });
}
