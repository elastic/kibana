/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { ExpandedDocLinkability } from '../../common/expanded_doc';

/**
 * Explains why the current query cannot produce links to individual documents, or `undefined`
 * when it can. Shared by the doc viewer's copy link action and the share menu so the two give
 * the same explanation.
 */
export const getExpandedDocLinkDisabledReason = (
  linkability: ExpandedDocLinkability
): string | undefined => {
  switch (linkability) {
    case ExpandedDocLinkability.EsqlMissingMetadata:
      return i18n.translate('discover.expandedDoc.esqlMissingMetadataReason', {
        defaultMessage:
          'Add METADATA _id, _index to your ES|QL query to link to individual results.',
      });
    case ExpandedDocLinkability.EsqlTransformational:
      return i18n.translate('discover.expandedDoc.esqlTransformationalReason', {
        defaultMessage:
          'Links to individual results are unavailable for queries that transform rows, such as STATS or KEEP.',
      });
    default:
      return undefined;
  }
};
