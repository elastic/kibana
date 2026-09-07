/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function getActionTypeIdFromStepType(stepType: string): string {
  const cleanStepType = stepType.startsWith('.') ? stepType.slice(1) : stepType;
  const [actionType] = cleanStepType.split('.');
  return `.${actionType}`;
}

export function getActionTypeDisplayNameFromStepType(stepType: string): string {
  const actionType = getActionTypeIdFromStepType(stepType).slice(1); // Remove the leading dot
  return actionType.charAt(0).toUpperCase() + actionType.slice(1);
}
