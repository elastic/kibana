/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ICommandMethods } from '../registry';
import type { ICommandContext } from '../types';
import type { Commands } from '../../definitions/keywords';
export declare const whereCommand: {
  name: Commands;
  methods: ICommandMethods<ICommandContext>;
  metadata: {
    description: string;
    declaration: string;
    examples: string[];
  };
};
