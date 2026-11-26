/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { of } from 'rxjs';
import type { ILicense } from '@kbn/licensing-types';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { getSourceCommandFromESQLQuery, hasAggregatingCommand } from '@kbn/esql-utils';
import { getCategorizationField } from '@kbn/aiops-utils';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { ESQL_CATEGORIZE_PRODUCT_FEATURE_ID } from '../../../../../common/constants';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useAppStateSelector, useCurrentDataSource } from '../../state_management/redux';

const NO_LICENSE$ = of(undefined);
const TEXT_ES_TYPES: ReadonlySet<string | undefined> = new Set([
  ES_FIELD_TYPES.TEXT,
  ES_FIELD_TYPES.MATCH_ONLY_TEXT,
]);

/**
 * Returns the field the current ES|QL results can be grouped by with CATEGORIZE, or undefined when grouping is not available.
 */
export const useGroupSimilarMessagesField = (): string | undefined => {
  const { core, licensing } = useDiscoverServices();
  const license = useObservable<ILicense | undefined>(licensing?.license$ ?? NO_LICENSE$);
  const query = useAppStateSelector((state) => state.query);
  const currentDataSource = useCurrentDataSource();

  return useMemo(() => {
    if (
      !isOfAggregateQueryType(query) ||
      currentDataSource?.kind !== 'esql' ||
      currentDataSource.query !== query.esql.trim()
    ) {
      return undefined;
    }

    // CATEGORIZE requires a platinum license and is not available on every serverless tier
    const hasLicense = Boolean(license?.isActive && license.hasAtLeast('platinum'));
    if (!hasLicense || !core.pricing.isFeatureAvailable(ESQL_CATEGORIZE_PRODUCT_FEATURE_ID)) {
      return undefined;
    }

    if (getSourceCommandFromESQLQuery(query.esql) !== 'FROM' || hasAggregatingCommand(query.esql)) {
      return undefined;
    }

    // Like the Patterns tab, only text fields are candidates
    const textColumns = currentDataSource.resultColumns
      .filter(({ meta }) => TEXT_ES_TYPES.has(meta.esType))
      .map(({ name }) => name);

    return getCategorizationField(textColumns);
  }, [core.pricing, currentDataSource, license, query]);
};
