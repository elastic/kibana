/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import express from 'express';

const app = express();

app.get('/api/ping', (req, resp) => {
  resp.send('pong');
});

app.post('/api/run_scenario', (req, resp) => {
  resp.send(200);
});

app.listen(4000, () => console.log('Server is running on port 5000'));
