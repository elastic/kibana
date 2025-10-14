/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ICommandMethods } from '../../registry';
import { autocomplete } from './autocomplete';
import type { ICommandContext } from '../../types';

const setCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
};

export const setCommand = {
  name: 'set',
  methods: setCommandMethods,
  metadata: {
    description: 'Set a query setting', // HD imporeve
    declaration: `SET <setting> = <value>`,
    examples: [], // HD SET example
    hidden: false, // HD
    preview: true,
    name: 'set',
  },
};
