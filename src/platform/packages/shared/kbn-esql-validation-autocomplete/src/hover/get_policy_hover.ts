/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { type ESQLSource } from '@kbn/esql-ast/src/types';
import {
  ENRICH_MODES,
  modeDescription,
} from '@kbn/esql-ast/src/commands_registry/commands/enrich/util';
import type { ESQLCallbacks } from '../shared/types';
import { fromCache, setToCache } from './hover_cache';
import { getPolicyHelper } from '../shared/resources_helpers';

export async function getPolicyHover(
  source: ESQLSource,
  callbacks?: ESQLCallbacks
): Promise<Array<{ value: string }>> {
  // Use policy name as cache key
  const cacheKey = source.name;
  const cached = fromCache(cacheKey);
  if (cached) {
    return cached;
  }

  const result: Array<{ value: string }> = [];
  const { getPolicyMetadata } = getPolicyHelper(callbacks);
  const policyMetadata = await getPolicyMetadata(source.name);

  if (policyMetadata) {
    result.push(
      ...[
        {
          value: `${i18n.translate('kbn-esql-validation-autocomplete.esql.hover.policyIndexes', {
            defaultMessage: '**Indexes**',
          })}: ${policyMetadata.sourceIndices.join(', ')}`,
        },
        {
          value: `${i18n.translate(
            'kbn-esql-validation-autocomplete.esql.hover.policyMatchingField',
            {
              defaultMessage: '**Matching field**',
            }
          )}: ${policyMetadata.matchField}`,
        },
        {
          value: `${i18n.translate(
            'kbn-esql-validation-autocomplete.esql.hover.policyEnrichedFields',
            {
              defaultMessage: '**Fields**',
            }
          )}: ${policyMetadata.enrichFields.join(', ')}`,
        },
      ]
    );
  }

  if (!!source.prefix) {
    const mode = ENRICH_MODES.find(
      ({ name }) => '_' + name === source.prefix!.valueUnquoted.toLowerCase()
    )!;
    if (mode) {
      result.push(
        ...[
          { value: modeDescription },
          {
            value: `**${mode.name}**: ${mode.description}`,
          },
        ]
      );
    }
  }

  setToCache(cacheKey, result);
  return result;
}
