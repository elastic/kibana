/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import type { AggregateQuery } from '@kbn/es-query';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { ILicense } from '@kbn/licensing-types';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { KqlPluginStart } from '@kbn/kql/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ESQLControlVariable } from '@kbn/esql-types';

export interface ControlsContext {
  /** The editor supports the creation of controls,
   * This flag should be set to true to display the "Create control" suggestion
   **/
  supportsControls: boolean;
  /** Function to be called after the control creation **/
  onSaveControl: (controlState: Record<string, unknown>, updatedQuery: string) => Promise<void>;
  /** Function to be called after cancelling the control creation **/
  onCancelControl: () => void;
}

export interface DataErrorsControl {
  enabled: boolean;
  onChange: (value: boolean) => void;
}

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
  /** Hide the Run query button which appears when editor is inlined*/
  hideRunQueryButton?: boolean;
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
  /** hide quick search **/
  hideQuickSearch?: boolean;
  /** adds border in the editor **/
  hasOutline?: boolean;
  /** adds a documentation icon in the footer which opens the inline docs as a flyout **/
  displayDocumentationAsFlyout?: boolean;
  /** The component by default focuses on the editor when it is mounted, this flag disables it**/
  disableAutoFocus?: boolean;
  /** Enables the creation of controls from the editor **/
  controlsContext?: ControlsContext;
  /** Opens the given query in a new Discover tab **/
  onOpenQueryInNewTab?: (tabName: string, esqlQuery: string) => Promise<void>;
  /** The available ESQL variables from the page context this editor was opened in */
  esqlVariables?: ESQLControlVariable[];
  /** Resize the editor to fit the initially passed query on mount */
  expandToFitQueryOnMount?: boolean;
  /** Allows controlling the switch to toggle data errors in the UI. If not provided the switch will be hidden and data errors visible */
  dataErrorsControl?: DataErrorsControl;
  /** Optional form field label to show above the query editor */
  formLabel?: string;
  /** Whether to merge external messages into the editor's message list */
  mergeExternalMessages?: boolean;
  /** If true, automatically opens the quick search visor when the editor initially loads with a query that has only source commands */
  openVisorOnSourceCommands?: boolean;
}

interface ESQLVariableService {
  isCreateControlSuggestionEnabled: boolean;
  esqlVariables: ESQLControlVariable[];
  enableCreateControlSuggestion: () => void;
  disableCreateControlSuggestion: () => void;
  clearVariables: () => void;
  addVariable: (variable: ESQLControlVariable) => void;
}

export interface EsqlPluginStartBase {
  variablesService: ESQLVariableService;
  getLicense: () => Promise<ILicense | undefined>;
  isServerless: boolean;
}

export interface ESQLEditorDeps {
  core: CoreStart;
  data: DataPublicPluginStart;
  storage: Storage;
  uiActions: UiActionsStart;
  kql: KqlPluginStart;
  fieldsMetadata?: FieldsMetadataPublicStart;
  usageCollection?: UsageCollectionStart;
  esql?: EsqlPluginStartBase;
}

export enum HistoryTabId {
  recentQueries = 'history-queries-tab',
  standardQueries = 'starred-queries-tab',
}
