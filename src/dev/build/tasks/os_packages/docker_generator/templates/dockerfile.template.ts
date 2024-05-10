/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import Mustache from 'mustache';

import { TemplateContext } from '../template_context';

function generator(options: TemplateContext) {
  const dir = options.ironbank ? 'ironbank' : 'base';
  const template = readFileSync(resolve(__dirname, dir, './Dockerfile'));
  let packageManager = null;
  switch (options.baseImage) {
    case 'ubi':
      packageManager = 'microdnf';
      break;
    case 'ubuntu':
      packageManager = 'apt-get';
      break;
    case 'chainguard':
      packageManager = 'apk';
      break;
  }
  return Mustache.render(template.toString(), {
    packageManager,
    chainguard: options.baseImage === 'chainguard',
    ubi: options.baseImage === 'ubi',
    ubuntu: options.baseImage === 'ubuntu',
    opensslLegacyProvider: !(options.cloud || options.serverless || options.fips),
    ...options,
  });
}

export const dockerfileTemplate = {
  name: 'Dockerfile',
  generator,
};
