/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export function getParsedReasonFromShardFailure(causedBy?: {
  type: string;
  reason?: string | null;
}): string | null {
  const cantSortRegExp = /Can't sort on field \[(.+)\];/;
  const matchReason = cantSortRegExp.exec(causedBy?.reason ?? '');

  if (causedBy?.type === 'illegal_argument_exception' && matchReason) {
    return i18n.translate('searchErrors.cantSortReasonText', {
      defaultMessage:
        'The results could not be sorted on field "{field}" because it has incompatible types across shards or it is unmapped in some of them. Consider updating the field mapping, adding "exist" filter for the field value to skip unmapped values, or removing the sort.',
      values: {
        field: matchReason[1],
      },
    });
  }

  return null;
}
