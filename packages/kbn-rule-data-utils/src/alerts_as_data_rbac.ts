/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { EsQueryConfig } from '@kbn/es-query';

/**
 * registering a new instance of the rule data client
 * in a new plugin will require updating the below data structure
 * to include the index name where the alerts as data will be written to.
 */

export const AlertConsumers = {
  APM: 'apm',
  LOGS: 'logs',
  INFRASTRUCTURE: 'infrastructure',
  OBSERVABILITY: 'observability',
  SIEM: 'siem',
  UPTIME: 'uptime',
} as const;
export type AlertConsumers = typeof AlertConsumers[keyof typeof AlertConsumers];
export type STATUS_VALUES = 'open' | 'acknowledged' | 'closed' | 'in-progress'; // TODO: remove 'in-progress' after migration to 'acknowledged'

export type ValidFeatureId = AlertConsumers;

export const validFeatureIds = Object.values(AlertConsumers).map((v) => v as string);
export const isValidFeatureId = (a: unknown): a is ValidFeatureId =>
  typeof a === 'string' && validFeatureIds.includes(a);

/**
 * Prevent javascript from returning Number.MAX_SAFE_INTEGER when Elasticsearch expects
 * Java's Long.MAX_VALUE. This happens when sorting fields by date which are
 * unmapped in the provided index
 *
 * Ref: https://github.com/elastic/elasticsearch/issues/28806#issuecomment-369303620
 *
 * return stringified Long.MAX_VALUE if we receive Number.MAX_SAFE_INTEGER
 * @param sortIds estypes.SortResults | undefined
 * @returns SortResults
 */
export const getSafeSortIds = (sortIds: estypes.SortResults | null | undefined) => {
  if (sortIds == null) {
    return sortIds;
  }
  return sortIds.map((sortId) => {
    // haven't determined when we would receive a null value for a sort id
    // but in case we do, default to sending the stringified Java max_int
    if (sortId == null || sortId === '' || sortId >= Number.MAX_SAFE_INTEGER) {
      return '9223372036854775807';
    }
    return sortId;
  });
};

interface GetEsQueryConfigParamType {
  allowLeadingWildcards?: EsQueryConfig['allowLeadingWildcards'];
  queryStringOptions?: EsQueryConfig['queryStringOptions'];
  ignoreFilterIfFieldNotInIndex?: EsQueryConfig['ignoreFilterIfFieldNotInIndex'];
  dateFormatTZ?: EsQueryConfig['dateFormatTZ'];
}

type ConfigKeys = keyof GetEsQueryConfigParamType;

export const getEsQueryConfig = (params?: GetEsQueryConfigParamType): EsQueryConfig => {
  const defaultConfigValues = {
    allowLeadingWildcards: true,
    queryStringOptions: { analyze_wildcard: true },
    ignoreFilterIfFieldNotInIndex: false,
    dateFormatTZ: 'Zulu',
  };
  if (params == null) {
    return defaultConfigValues;
  }
  const paramKeysWithValues = Object.keys(params).reduce((acc: EsQueryConfig, key) => {
    const configKey = key as ConfigKeys;
    if (params[configKey] != null) {
      return { [key]: params[configKey], ...acc };
    }
    return { [key]: defaultConfigValues[configKey], ...acc };
  }, {} as EsQueryConfig);
  return paramKeysWithValues;
};
