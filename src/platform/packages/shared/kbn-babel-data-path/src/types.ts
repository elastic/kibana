/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NodePath, PluginPass } from '@babel/core';
import type { JSXOpeningElement } from '@babel/types';
import type * as BabelTypes from '@babel/types';

export interface PluginOptions {
  repoRoot: string;
}

export interface PluginState extends PluginPass {
  opts: PluginOptions;
}

export interface AddDataPathAttributeOptions {
  babel: typeof BabelTypes;
  nodePath: NodePath<JSXOpeningElement>;
  state: PluginState;
}
