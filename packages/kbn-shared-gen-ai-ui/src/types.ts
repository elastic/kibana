/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// /*
//  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
//  * or more contributor license agreements. Licensed under the "Elastic License
//  * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
//  * Public License v 1"; you may not use this file except in compliance with, at
//  * your election, the "Elastic License 2.0", the "GNU Affero General Public
//  * License v3.0 only", or the "Server Side Public License, v 1".
//  */

// export enum DisplayType {
//   TEXTBOX = 'textbox',
//   TEXTAREA = 'textarea',
//   NUMERIC = 'numeric',
//   TOGGLE = 'toggle',
//   DROPDOWN = 'dropdown',
//   CHECKABLE = 'checkable',
// }

// export interface Dependency {
//   field: string;
//   value: string | number | boolean | null;
// }

// export interface SelectOption {
//   label: string;
//   value: string;
//   icon?: string;
// }

// export enum FieldType {
//   STRING = 'str',
//   INTEGER = 'int',
//   LIST = 'list',
//   BOOLEAN = 'bool',
// }

// export interface Validation {
//   constraint: string | number;
//   type: string;
// }

// export interface ConfigProperties {
//   category?: string;
//   default_value: string | number | boolean | null;
//   depends_on: Dependency[];
//   display: DisplayType;
//   label: string;
//   options?: SelectOption[];
//   order?: number | null;
//   placeholder?: string;
//   required: boolean;
//   sensitive: boolean;
//   tooltip: string | null;
//   type: FieldType;
//   ui_restrictions: string[];
//   validations: Validation[];
//   value: string | number | boolean | null;
// }

// export type ConfigProperties = ConnectorConfigProperties;
import { ConnectorConfigProperties as ConfigProperties } from '@kbn/search-connectors';

export type FieldsConfiguration = Record<string, ConfigProperties>;

export interface InferenceTaskType {
  task_type: string;
  configuration: FieldsConfiguration;
}

export interface InferenceProvider {
  provider: string;
  task_types: InferenceTaskType[];
  logo?: string;
  configuration: FieldsConfiguration;
}

// interface ConfigEntry extends ConfigProperties {
//   key: string;
// }

// export interface ConfigEntryView extends ConfigEntry {
//   isValid: boolean;
//   validationErrors: string[];
// }

export const types = 'global types';

export interface Config {
  taskType: string;
  taskTypeConfig?: Record<string, unknown>;
  inferenceId: string;
  provider: string;
  providerConfig?: Record<string, unknown>;
}

export interface Secrets {
  providerSecrets?: Record<string, unknown>;
}
