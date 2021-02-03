/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { IndexPatternField } from '../../../../../../data/public';

export function getWarnings(field: IndexPatternField) {
  let warnings = [];

  if (field.scripted) {
    warnings.push(
      i18n.translate(
        'discover.fieldChooser.discoverField.scriptedFieldsTakeLongExecuteDescription',
        {
          defaultMessage: 'Scripted fields can take a long time to execute.',
        }
      )
    );
  }

  if (warnings.length > 1) {
    warnings = warnings.map(function (warning, i) {
      return (i > 0 ? '\n' : '') + (i + 1) + ' - ' + warning;
    });
  }

  return warnings;
}
