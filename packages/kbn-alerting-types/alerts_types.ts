/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TechnicalRuleDataFieldName } from '@kbn/rule-data-utils';
import { JsonValue } from '@kbn/utility-types';

export interface MetaAlertFields {
  _id: string;
  _index: string;
}

export interface LegacyField {
  field: string;
  value: Array<string | number>;
}

export interface EsQuerySnapshot {
  request: string[];
  response: string[];
}

export type KnownAlertFields = {
  [Property in TechnicalRuleDataFieldName]?: JsonValue[];
};

export type UnknownAlertFields = Record<string, string | JsonValue[]>;

/**
 * Alert document type as returned by alerts search requests
 *
 * Use the AdditionalFields type parameter to add additional fields to the alert type
 */
export type Alert<AdditionalFields extends UnknownAlertFields = UnknownAlertFields> =
  KnownAlertFields & AdditionalFields & MetaAlertFields;
