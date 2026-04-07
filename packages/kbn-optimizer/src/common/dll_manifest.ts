/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Crypto from 'crypto';

export interface DllManifest {
  name: string;
  content: Record<string, any>;
}

export interface ParsedDllManifest {
  name: string;
  content: Record<string, any>;
}

const hash = (s: string) => {
  return Crypto.createHash('sha1').update(s).digest('base64').replace(/=+$/, '');
};

export function parseDllManifest(manifest: DllManifest): ParsedDllManifest {
  return {
    name: manifest.name,
    content: Object.fromEntries(
      Object.entries(manifest.content).map(([k, v]) => {
        const { id, buildMeta, ...other } = v;
        const metaJson = JSON.stringify(buildMeta) || '{}';
        const otherJson = JSON.stringify(other) || '{}';

        return [
          k,
          [
            v.id,
            ...(metaJson !== '{}' ? [hash(metaJson)] : []),
            ...(otherJson !== '{}' ? [hash(otherJson)] : []),
          ].join(':'),
        ];
      })
    ),
  };
}
