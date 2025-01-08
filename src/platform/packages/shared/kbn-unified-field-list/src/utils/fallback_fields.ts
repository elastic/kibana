/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pipe } from 'fp-ts/lib/function';
import { uniq } from 'lodash';
import { AdditionalFieldGroups } from '../types';

interface FieldsInfo {
  fields: string[];
  additionalFieldGroups?: AdditionalFieldGroups;
}

/**
 * Converts fields to fallback fields where necessary, e.g. in the case of Smart Fields which
 * don't map 1:1 with a real backing field.
 */

export const convertFieldsToFallbackFields = (props: FieldsInfo) => {
  const convertedFields = pipe(props, convertSmartFields);
  return uniq(convertedFields.fields);
};

/**
 * Specifically converts Smart Fields to their associated fallback fields. Part of the convertFieldsToFallbackFields pipeline.
 */
const convertSmartFields = ({ fields, additionalFieldGroups }: FieldsInfo) => {
  if (!additionalFieldGroups?.smartFields) return { fields, additionalFieldGroups };

  const convertedFields = fields.flatMap((fieldName) => {
    const smartField = additionalFieldGroups.smartFields!.find((field) => field.name === fieldName);

    if (smartField) {
      return additionalFieldGroups.fallbackFields?.[fieldName] ?? [];
    }

    return [fieldName];
  });

  return { fields: convertedFields, additionalFieldGroups };
};

/**
 * Provides a flat list of all fallback fields
 */
export const getAllFallbackFields = (additionalFieldGroups?: AdditionalFieldGroups) =>
  Object.entries(additionalFieldGroups?.fallbackFields ?? {}).flatMap(([key, value]) => value);

/**
 * Returns a list of Smart Fields associated with a given fallback field name.
 */
export const getAssociatedSmartFields = (
  fieldName: string,
  additionalFieldGroups?: AdditionalFieldGroups
) =>
  Object.entries(additionalFieldGroups?.fallbackFields ?? {}).reduce<string[]>(
    (acc, [key, value]) => {
      if (value.includes(fieldName)) {
        acc.push(key);
      }
      return acc;
    },
    []
  );

/**
 * Returns a list of Smart Fields associated with a given fallback field name formatted as a string.
 */
export const getAssociatedSmartFieldsAsString = (
  fieldName: string,
  additionalFieldGroups?: AdditionalFieldGroups,
  delimiter = ', '
) => getAssociatedSmartFields(fieldName, additionalFieldGroups).join(delimiter);
