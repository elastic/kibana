/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MessageChannel } from 'node:worker_threads';
import { expose } from './expose';
import { ExposeOuter } from './expose_outer';
import { ExposeSecret } from './expose_secret';
import { openPortSession } from './message_port_session';

describe('expose', () => {
  it("invokes methods on the author instance so private fields survive Cap'n Web", async () => {
    const { port1, port2 } = new MessageChannel();
    const client = openPortSession<ExposeSecret>(port1);
    openPortSession(port2, expose(new ExposeSecret(2)));

    await expect(client.add(3)).resolves.toBe(5);
    port1.close();
    port2.close();
  });

  it('stubs remotable objects returned from a method', async () => {
    const { port1, port2 } = new MessageChannel();
    const client = openPortSession<ExposeOuter>(port1);
    openPortSession(port2, expose(new ExposeOuter()));

    const child = await client.child();
    await expect(child.value()).resolves.toBe(4);
    port1.close();
    port2.close();
  });
});
