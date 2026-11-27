/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Throwaway spike. Stands in for a tiny shared "tokens" package: types + tokens only,
 * no runtime code, no plugin imports. Both sides of every soft dependency import from here,
 * never from each other.
 */

import { createToken } from '@kbn/core-di';

/** Option A: a provider API that a consumer pulls if present. */
export interface Greeter {
  greet(): string;
}
export const OptAGreeter = createToken<Greeter>('spike.optA.Greeter');
export const OptBGreeter = createToken<Greeter>('spike.optB.Greeter');

/** Option B: an extension a consumer pushes; the registry owner collects all of them. */
export interface WidgetFactory {
  type: string;
  render(): string;
}
export const RegAWidget = createToken<WidgetFactory>('spike.regA.Widget');
export const RegBWidget = createToken<WidgetFactory>('spike.regB.Widget');

/** Option C: classic start contracts resolved through core.plugins.onStart. */
export interface RtStart {
  greet(): string;
}
