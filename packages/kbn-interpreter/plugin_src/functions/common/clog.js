/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const clog = () => ({
  name: 'clog',
  help: 'Outputs the context to the console',
  fn: context => {
    console.log(context); //eslint-disable-line no-console
    return context;
  },
});
