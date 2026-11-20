/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Throwaway spike: how a plugin author unit-tests a soft consumer. No Kibana boot, no provider
 * plugin; the test either binds the token or leaves it unbound.
 */

import { Container, inject, injectable, optional } from 'inversify';
import { type Greeter, OptAGreeter, RegAWidget } from './tokens';

@injectable()
class Banner {
  constructor(@inject(OptAGreeter) @optional() private readonly greeter?: Greeter) {}
  text() {
    return this.greeter?.greet() ?? 'default banner';
  }
}

describe('soft consumer', () => {
  it('uses the provider when it is bound', () => {
    const container = new Container();
    container.bind(OptAGreeter).toConstantValue({ greet: () => 'mocked provider' });
    container.bind(Banner).toSelf();

    expect(container.get(Banner).text()).toBe('mocked provider');
  });

  it('falls back when the provider is absent', () => {
    const container = new Container();
    container.bind(Banner).toSelf();

    expect(container.get(Banner).text()).toBe('default banner');
  });

  it('registry owner sees no contributions when no plugin contributes', () => {
    const container = new Container();

    expect(container.getAll(RegAWidget, { optional: true })).toEqual([]);
  });
});
