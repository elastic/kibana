/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import fs from 'fs';
import path from 'path';
import _ from 'lodash';
const grammar = fs.readFileSync(path.resolve(__dirname, '../../../common/chain.peg'), 'utf8');
import PEG from 'pegjs';
const Parser = PEG.generate(grammar);

export default function parseSheet(sheet) {
  return _.map(sheet, function (plot) {
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
