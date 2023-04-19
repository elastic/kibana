/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import frontmatter from 'front-matter';
import { compile } from '@storybook/mdx2-csf';
import fs from 'fs';

const DEFAULT_RENDERER = `
import React from 'react';
`;

// @ts-expect-error
module.exports = async function (_source) {
  // @ts-expect-error
  const file = fs.readFileSync(this.resource);
  const { attributes, body } = frontmatter(file.toString());
  const attributesSrc = `export const attributes = ${JSON.stringify(attributes)};\n`;

  // @ts-expect-error
  const callback = this.async();
  const options = {
    // @ts-expect-error
    filepath: this.resourcePath,
    skipCsf: true,
  };

  let result;
  try {
    result = await compile(body, options);
  } catch (err) {
    return callback(err);
  }

  const code = `${DEFAULT_RENDERER}\n${result}\n${attributesSrc}`;
  return callback(null, code);
};
