/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { TAB_IDS, type TabId } from '../../types';
import { dashboardListingTableStrings } from '../../_dashboard_listing_strings';

export interface EntityNames {
  entityName: string;
  entityNamePlural: string;
}

export const getEntityNames = (contentTypeFilter?: TabId): EntityNames => {
  switch (contentTypeFilter) {
    case TAB_IDS.VISUALIZATIONS:
      // These match the i18n keys in visualizations plugin for consistency
      return {
        entityName: i18n.translate('visualizations.listing.table.entityName', {
          defaultMessage: 'visualization',
        }),
        entityNamePlural: i18n.translate('visualizations.listing.table.entityNamePlural', {
          defaultMessage: 'visualizations',
        }),
      };

    case TAB_IDS.ANNOTATIONS:
      return {
        entityName: i18n.translate('eventAnnotationListing.table.entityName', {
          defaultMessage: 'annotation group',
        }),
        entityNamePlural: i18n.translate('eventAnnotationListing.table.entityNamePlural', {
          defaultMessage: 'annotation groups',
        }),
      };
    default:
      return {
        entityName: dashboardListingTableStrings.getEntityName(),
        entityNamePlural: dashboardListingTableStrings.getEntityNamePlural(),
      };
  }
};
