/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isUndefined, omitBy } from 'lodash';
import deepEqual from 'fast-deep-equal';
import type { SerializedStateComparison } from '@kbn/presentation-publishing';
import { byValueComparator, titleComparators } from '@kbn/presentation-publishing';
import type { LinksByReferenceState, LinksByValueState } from './types';

type LinksComparedState = LinksByValueState & LinksByReferenceState;

export const linksStateComparison: SerializedStateComparison<LinksComparedState> = {
  comparators: {
    ...titleComparators,
    layout: byValueComparator('referenceEquality'),
    links: byValueComparator<LinksComparedState, 'links'>((aLinks, bLinks) => {
      if (aLinks?.length !== bLinks?.length) {
        return false;
      }
      return (aLinks ?? []).every((linkFromA, index) =>
        deepEqual(omitBy(linkFromA, isUndefined), omitBy(bLinks?.[index], isUndefined))
      );
    }),
    ref_id: 'referenceEquality',
  },
};
