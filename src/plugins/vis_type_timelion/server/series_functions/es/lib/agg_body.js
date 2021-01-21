/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export function buildAggBody(fieldName, scriptedFields) {
  const scriptedField = scriptedFields.find((field) => {
    return field.name === fieldName;
  });

  if (scriptedField) {
    return {
      script: {
        source: scriptedField.script,
        lang: scriptedField.lang,
      },
    };
  }

  return {
    field: fieldName,
  };
}
