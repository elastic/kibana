/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { getESQLQueryVariables } from '@kbn/esql-utils';
import {
  apiPublishesESQLQuery,
  type PublishingSubject,
  type RelatedPanelsConfig,
} from '@kbn/presentation-publishing';

export const panelIsRelatedByEsqlVariable = ({
  esqlVariable$,
}: {
  esqlVariable$: PublishingSubject<ESQLControlVariable>;
}) => {
  const dependentObservables = [esqlVariable$] as const;

  return {
    dependentObservables,
    siblingDependentObservableNames: ['query$'],
    isRelated: (sibling, [selfESQLVariable], [siblingQuery]) => {
      if (!apiPublishesESQLQuery(sibling)) return false;
      const { esql: siblingESQL } = siblingQuery ?? {};
      return Boolean(
        siblingESQL && getESQLQueryVariables(siblingESQL).includes(selfESQLVariable.key)
      );
    },
  } satisfies RelatedPanelsConfig<typeof dependentObservables, [AggregateQuery | undefined]>;
};
