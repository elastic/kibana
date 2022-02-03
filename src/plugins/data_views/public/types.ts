/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionsSetup } from 'src/plugins/expressions/public';
import { FieldFormatsSetup, FieldFormatsStart } from 'src/plugins/field_formats/public';
import { PublicMethodsOf } from '@kbn/utility-types';
import { DataViewsService } from './data_views';

export interface DataViewsPublicSetupDependencies {
  expressions: ExpressionsSetup;
  fieldFormats: FieldFormatsSetup;
}

export interface DataViewsPublicStartDependencies {
  fieldFormats: FieldFormatsStart;
}

/**
 * Data plugin public Setup contract
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataViewsPublicPluginSetup {}

export interface DataViewsServicePublic extends DataViewsService {
  getCanSaveSync: () => boolean;
}

export type DataViewsContract = PublicMethodsOf<DataViewsServicePublic>;

/**
 * Data views plugin public Start contract
 */
export type DataViewsPublicPluginStart = PublicMethodsOf<DataViewsServicePublic>;
