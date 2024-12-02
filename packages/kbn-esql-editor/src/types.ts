/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { AggregateQuery } from '@kbn/es-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { IndexManagementPluginSetup } from '@kbn/index-management-shared-types';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { PresentationContainer } from '@kbn/presentation-containers';
import type { EsqlVariablesService } from '@kbn/esql/common';

export interface ESQLEditorProps {
  /** The aggregate type query */
  query: AggregateQuery;
  /** Callback running everytime the query changes */
  onTextLangQueryChange: (query: AggregateQuery) => void;
  /** Callback running when the user submits the query */
  onTextLangQuerySubmit: (
    query?: AggregateQuery,
    abortController?: AbortController
  ) => Promise<void>;
  /** If it is true, the editor displays the message @timestamp found
   * The text based queries are relying on adhoc dataviews which
   * can have an @timestamp timefield or nothing
   */
  detectedTimestamp?: string;
  /** Array of errors */
  errors?: Error[];
  /** Warning string as it comes from ES */
  warning?: string;
  /** Disables the editor and displays loading icon in run button
   * It is also used for hiding the history component if it is not defined
   */
  isLoading?: boolean;
  /** Disables the editor */
  isDisabled?: boolean;
  dataTestSubj?: string;
  /** Hide the Run query information which appears on the footer*/
  hideRunQueryText?: boolean;
  /** This is used for applications (such as the inline editing flyout in dashboards)
   * which want to add the editor without being part of the Unified search component
   * It renders a submit query button inside the editor
   */
  editorIsInline?: boolean;
  /** Disables the submit query action*/
  disableSubmitAction?: boolean;

  /** when set to true enables query cancellation **/
  allowQueryCancellation?: boolean;

  /** hide @timestamp info **/
  hideTimeFilterInfo?: boolean;

  /** hide query history **/
  hideQueryHistory?: boolean;

  /** adds border in the editor **/
  hasOutline?: boolean;

  /** adds a documentation icon in the footer which opens the inline docs as a flyout **/
  displayDocumentationAsFlyout?: boolean;

  /** very important for controls creation from the editor **/
  dashboardApi?: PresentationContainer;

  panelId?: string;

  /** The component by default focuses on the editor when it is mounted, this flag disabled it**/
  disableAutoFocus?: boolean;
}

export interface ESQLEditorDeps {
  core: CoreStart;
  dataViews: DataViewsPublicPluginStart;
  expressions: ExpressionsStart;
  storage: Storage;
  uiActions: UiActionsStart;
  indexManagementApiService?: IndexManagementPluginSetup['apiService'];
  fieldsMetadata?: FieldsMetadataPublicStart;
  usageCollection?: UsageCollectionStart;
  esqlService: EsqlVariablesService;
}
