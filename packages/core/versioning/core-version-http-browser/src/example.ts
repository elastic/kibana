/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VersionHTTPToolkit } from './version_http_toolkit';

const vtk = {} as unknown as VersionHTTPToolkit;
const client = vtk.createClient({ version: '1' });

// Now we just use client as usual.

interface FooResponse {
  foo: string;
}

client.get<FooResponse>('/api/foo');
