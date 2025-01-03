/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { parseTimelionExpression } from '../../../common/parser';

export default function parseSheet(sheet) {
  return sheet.map(function (plot) {
    try {
      return parseTimelionExpression(plot).tree;
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
