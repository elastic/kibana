/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import type { Profile } from '../types';
import { ContextWithProfileId, ProfileProvider, ProfileService } from '../profile_service';
import type { RootContext } from './root_profile';
import type { DataSourceContext } from './data_source_profile';

/**
 * Indicates the current document type (e.g. log, alert, etc.)
 */
export enum DocumentType {
  Log = 'log',
  Default = 'default',
}

/**
 * The document profile interface
 */
export type DocumentProfile = Pick<Profile, 'getDocViewer'>;

/**
 * Parameters for the document profile provider `resolve` method
 */
export interface DocumentProfileProviderParams {
  /**
   * The current root context
   */
  rootContext: ContextWithProfileId<RootContext>;
  /**
   * The current data source context
   */
  dataSourceContext: ContextWithProfileId<DataSourceContext>;
  /**
   * The current data table record
   */
  record: DataTableRecord;
}

/**
 * The resulting context object returned by the document profile provider `resolve` method
 */
export interface DocumentContext {
  /**
   * The current document type
   */
  type: DocumentType;
}

export type DocumentProfileProvider<TProviderContext = {}> = ProfileProvider<
  DocumentProfile,
  DocumentProfileProviderParams,
  DocumentContext & TProviderContext
>;

export class DocumentProfileService extends ProfileService<DocumentProfileProvider> {
  constructor() {
    super({
      profileId: 'default-document-profile',
      type: DocumentType.Default,
    });
  }
}
