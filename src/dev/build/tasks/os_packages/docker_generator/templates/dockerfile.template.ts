/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import Mustache from 'mustache';

import { TemplateContext } from '../template_context';

function generator(options: TemplateContext) {
  const template = readFileSync(resolve(__dirname, './Dockerfile'));
  return Mustache.render(template.toString(), {
    packageManager: options.ubiImageFlavor ? 'microdnf' : 'yum',
    ...options,
  });
}

export const dockerfileTemplate = {
  name: 'Dockerfile',
  generator,
};
