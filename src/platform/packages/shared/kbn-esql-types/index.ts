/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  ESQLVariableType,
  EsqlControlType,
  VariableNamePrefix,
  type ControlWidthOptions,
  type ESQLControlState,
  type ESQLControlVariable,
  type PublishesESQLVariable,
  type PublishesESQLVariables,
  apiPublishesESQLVariable,
  apiPublishesESQLVariables,
  controlHasVariableName,
} from './src/variables_types';

export {
  type IndicesAutocompleteResult,
  type IndexAutocompleteItem,
  type ResolveIndexResponse,
  type ESQLSourceResult,
} from './src/sources_autocomplete_types';

export { type RecommendedQuery, type RecommendedField } from './src/extensions_autocomplete_types';

export {
  type InferenceEndpointsAutocompleteResult,
  type InferenceEndpointAutocompleteItem,
} from './src/inference_endpoint_autocomplete_types';

export {
  REGISTRY_EXTENSIONS_ROUTE,
  SOURCES_AUTOCOMPLETE_ROUTE,
  TIMEFIELD_ROUTE,
  SOURCES_TYPES,
  LOOKUP_INDEX_CREATE_ROUTE,
  LOOKUP_INDEX_UPDATE_ROUTE,
  LOOKUP_INDEX_RECREATE_ROUTE,
  LOOKUP_INDEX_PRIVILEGES_ROUTE,
  LOOKUP_INDEX_UPDATE_MAPPINGS_ROUTE,
} from './src/constants';

export {
  type ESQLTelemetryCallbacks,
  ControlTriggerSource,
  QuerySource,
  TelemetryControlCancelledReason,
  type TelemetryQuerySubmittedProps,
  type TelemetryLatencyProps,
} from './src/esql_telemetry_types';

export {
  type ESQLCallbacks,
  type PartialFieldsMetadataClient,
  type ESQLFieldWithMetadata,
  type EsqlFieldType,
  esqlFieldTypes,
} from './src/editor_types';
