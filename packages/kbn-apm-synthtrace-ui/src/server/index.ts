/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import express, { Request } from 'express';
import { runSynthraceScenario } from './generator';
import type { SynthtraceScenario } from '../typings';

const app = express();
app.use(express.json());

app.get('/api/ping', (req, resp) => {
  resp.send('pong');
});

app.post('/api/run_scenario', async (req: Request<{}, {}, SynthtraceScenario>, resp, next) => {
  try {
    await runSynthraceScenario({ scenario: req.body });
    resp.sendStatus(200);
  } catch (e) {
    const err = e as Error;
    resp.status(500);
    resp.send({ error: err.message });
  }
});

app.listen(4000, () => console.log('Server is running on port 4000'));
