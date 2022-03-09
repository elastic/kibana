/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Os from 'os';
import Path from 'path';

function maybeUseBat(bin: string) {
  return Os.platform().startsWith('win') ? `${bin}.bat` : bin;
}

const tempDir = Os.tmpdir();

export const BASE_PATH = Path.resolve(tempDir, 'kbn-es');

export const GRADLE_BIN = maybeUseBat('./gradlew');
export const ES_BIN = maybeUseBat('bin/elasticsearch');
export const ES_PLUGIN_BIN = maybeUseBat('bin/elasticsearch-plugin');
export const ES_CONFIG = 'config/elasticsearch.yml';

export const ES_KEYSTORE_BIN = maybeUseBat('./bin/elasticsearch-keystore');
