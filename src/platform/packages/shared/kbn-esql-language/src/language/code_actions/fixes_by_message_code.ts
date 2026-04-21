/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { EsqlQuery, mutate } from '@elastic/esql';
import type { QuickFix } from './types';
import { EsqlSettingNames } from '../../commands/definitions/generated/settings';
import { UnmappedFieldsStrategy } from '../../commands/registry/types';
import { hasWiredStreamsInQuery } from '../../commands/definitions/utils/sources';

/**
 * Registry of quick fixes keyed by validation message code.
 *
 * Keeping fixes in a dedicated map (rather than inlined alongside message
 * text) separates "what went wrong" from "how the user can fix it", lets the
 * validation layer stay focused on producing error metadata, and makes it
 * trivial to add, remove, or review the full set of available fixes.
 */
export const fixesByMessageCode: Record<string, QuickFix> = {
  unknownColumn: {
    title: i18n.translate('kbn-esql-language.esql.quickFix.loadUnmappedFields', {
      defaultMessage: 'Load unmapped fields',
    }),
    displayCondition: hasWiredStreamsInQuery,
    fixQuery: (query: string) => {
      const esqlQuery = EsqlQuery.fromSrc(query, { withFormatting: true });
      mutate.commands.set.upsert(
        esqlQuery.ast,
        EsqlSettingNames.UNMAPPED_FIELDS,
        `"${UnmappedFieldsStrategy.LOAD}"`
      );
      return esqlQuery.print({ multiline: true });
    },
  },
};
