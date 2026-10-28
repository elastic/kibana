/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Container } from 'inversify';
import { RemotableDep } from './remotable_dep';
import { remotableDepToken, RemotableRoot } from './remotable_root';

describe('remotable', () => {
  it('registers the class with inversify without a separate @injectable()', () => {
    const container = new Container();
    container.bind(remotableDepToken).to(RemotableDep);
    container.bind(RemotableRoot).toSelf();

    expect(container.get(RemotableRoot).ping()).toBe('pong');
  });
});
