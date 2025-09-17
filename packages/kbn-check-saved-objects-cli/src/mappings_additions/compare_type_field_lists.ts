/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { difference } from 'lodash';

export interface CompareResult {
  error: boolean;
  fieldsToAdd: string[];
  registeredFields: string[];
  missingFromModelVersion: string[];
  missingFromDefinition: string[];
}

export const compareFieldLists = ({
  currentFields,
  registeredFields = [],
  modelVersionFields = [],
}: {
  currentFields: string[] | undefined;
  registeredFields: string[] | undefined;
  modelVersionFields: string[] | undefined;
}): CompareResult => {
  // type not present in the file, so it was just added.
  // in that case we just update the file to add all the registered fields.
  if (!currentFields) {
    return {
      error: false,
      registeredFields,
      fieldsToAdd: registeredFields,
      missingFromModelVersion: [],
      missingFromDefinition: [],
    };
  }

  // we search all registered/mv fields not already in the file
  const registeredFieldsNotInCurrent = difference(registeredFields, currentFields);
  const modelVersionFieldsNotInCurrent = difference(modelVersionFields, currentFields);

  // then we search for registered fields not in model versions, and the opposite
  const registeredFieldsNotInModelVersions = difference(
    registeredFieldsNotInCurrent,
    modelVersionFieldsNotInCurrent
  );
  const modelVersionFieldsNotRegistered = difference(
    modelVersionFieldsNotInCurrent,
    registeredFieldsNotInCurrent
  );

  // if any non-file field is present only in mapping definition or in model version, then there's an error on the type
  const anyFieldMissing =
    registeredFieldsNotInModelVersions.length > 0 || modelVersionFieldsNotRegistered.length > 0;

  return {
    error: anyFieldMissing,
    registeredFields,
    fieldsToAdd: registeredFieldsNotInCurrent,
    missingFromModelVersion: registeredFieldsNotInModelVersions,
    missingFromDefinition: modelVersionFieldsNotRegistered,
  };
};
