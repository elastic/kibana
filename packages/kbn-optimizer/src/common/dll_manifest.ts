/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface DllManifest {
  name: string;
  content: Record<string, any>;
}

export interface ParsedDllManifest {
  name: string;
  content: Record<string, string>;
}

export function parseDllManifest(manifest: DllManifest): ParsedDllManifest {
  return {
    name: manifest.name,
    content: Object.fromEntries(
      Object.entries(manifest.content).map(([k, v]) => [k, JSON.stringify(v)])
    ),
  };
}
