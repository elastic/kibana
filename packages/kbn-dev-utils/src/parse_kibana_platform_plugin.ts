/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Path from 'path';
import loadJsonFile from 'load-json-file';

export interface KibanaPlatformPlugin {
  readonly directory: string;
  readonly manifestPath: string;
  readonly manifest: {
    id: string;
    ui: boolean;
    server: boolean;
    [key: string]: unknown;
  };
}

export function parseKibanaPlatformPlugin(manifestPath: string): KibanaPlatformPlugin {
  if (!Path.isAbsolute(manifestPath)) {
    throw new TypeError('expected new platform manifest path to be absolute');
  }

  const manifest = loadJsonFile.sync(manifestPath);
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new TypeError('expected new platform plugin manifest to be a JSON encoded object');
  }

  if (typeof manifest.id !== 'string') {
    throw new TypeError('expected new platform plugin manifest to have a string id');
  }

  return {
    directory: Path.dirname(manifestPath),
    manifestPath,
    manifest: {
      ...manifest,

      ui: !!manifest.ui,
      server: !!manifest.server,
      id: manifest.id,
    },
  };
}
