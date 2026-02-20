/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import createContainer from 'constate';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { IToasts } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DiscoverSharedPublicStart } from '@kbn/discover-shared-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';

export interface UnifiedDocViewerContextualServices {
  analytics: AnalyticsServiceStart;
  data: DataPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  fieldsMetadata?: FieldsMetadataPublicStart;
  toasts: IToasts;
  storage: Storage;
  uiSettings: IUiSettingsClient;
  share?: SharePluginStart;
  core: CoreStart;
  discoverShared: DiscoverSharedPublicStart;
}

interface UseUnifiedDocViewerContextualServicesParams {
  services: UnifiedDocViewerContextualServices;
}

const useUnifiedDocViewerContextualServices = ({
  services,
}: UseUnifiedDocViewerContextualServicesParams) => {
  return services;
};

export const [UnifiedDocViewerServicesProvider, useUnifiedDocViewerServices] = createContainer(
  useUnifiedDocViewerContextualServices
);
