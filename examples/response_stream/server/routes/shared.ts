/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const entities = [
  'kimchy',
  's1monw',
  'martijnvg',
  'jasontedor',
  'nik9000',
  'javanna',
  'rjernst',
  'jrodewig',
];

export const getActions = (simulateError: boolean) => {
  const actions = [...Array(19).fill('add'), 'delete'];

  if (simulateError) {
    actions.push('throw-error');
    actions.push('emit-error');
  }

  return actions;
};
