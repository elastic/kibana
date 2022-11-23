/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BooleanRelation } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';

export const strings = {
  getDelimiterLabel: (booleanRelation: BooleanRelation) =>
    i18n.translate('unifiedSearch.filter.filtersBuilder.delimiterLabel', {
      defaultMessage: '{booleanRelation}',
      values: {
        booleanRelation,
      },
    }),
};
