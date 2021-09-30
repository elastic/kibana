/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from 'src/core/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { ExpressionsSetup } from 'src/plugins/expressions/public';
import { FieldFormatsSetup, FieldFormatsStart } from 'src/plugins/field_formats/public';
import { PublicMethodsOf } from '@kbn/utility-types';
import { DataViewsService } from './data_views';
// import { IndexPatternSelectProps, StatefulSearchBarProps } from './ui';
// import { UsageCollectionSetup, UsageCollectionStart } from '../../usage_collection/public';

export interface DataViewSetupDependencies {
  expressions: ExpressionsSetup;
  // usageCollection?: UsageCollectionSetup;
  fieldFormats: FieldFormatsSetup;
}

export interface DataViewStartDependencies {
  fieldFormats: FieldFormatsStart;
}

/**
 * Data plugin public Setup contract
 */
export interface DataViewPublicPluginSetup {}

/**
 * Data plugin public Start contract
 */
export type DataViewPublicPluginStart = PublicMethodsOf<DataViewsService>;

// todo look at this
export interface IDataPluginServices extends Partial<CoreStart> {
  appName: string;
  uiSettings: CoreStart['uiSettings'];
  savedObjects: CoreStart['savedObjects'];
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  storage: IStorageWrapper;
  data: DataViewPublicPluginStart;
  // usageCollection?: UsageCollectionStart;
}
