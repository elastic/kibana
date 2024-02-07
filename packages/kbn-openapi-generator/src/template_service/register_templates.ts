/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type Handlebars from '@kbn/handlebars';
import fs from 'fs/promises';
import path from 'path';

export async function registerTemplates(
  templatesPath: string,
  handlebarsInstance: typeof Handlebars
) {
  const files = await fs.readdir(templatesPath);

  const fileContentsPromises = files.map(async (file) => {
    const filePath = path.join(templatesPath, file);
    const content = await fs.readFile(filePath, 'utf-8');
    return { fileName: path.parse(file).name, content };
  });

  const fileContents = await Promise.all(fileContentsPromises);

  fileContents.forEach(({ fileName, content }) => {
    handlebarsInstance.registerPartial(fileName, content);
  });

  return Object.fromEntries(fileContents.map(({ fileName, content }) => [fileName, content]));
}
