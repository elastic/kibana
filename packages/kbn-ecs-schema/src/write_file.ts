/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import fs from 'fs';
import util from 'util';
import { GroupSchema, FieldDetails } from './types';

const TOP_LEVEL_GROUP = 'base';

export function printSchema(schema: GroupSchema, outPath: string) {
  printGroupFiles(schema, outPath);
  printIndex(schema['base'], Object.keys(schema), outPath);
}

function printGroupFiles(schema: GroupSchema, outPath: string) {
  for (const group in schema) {    
    if (group != TOP_LEVEL_GROUP) {
      console.log(`Writing ${group} to ${outPath}/${group.toLowerCase()}.ts`);

      const details = `export const ${group}Ecs = ${util.inspect(schema[group])}`;
      write(`${outPath}/${group.toLowerCase()}.ts`, details);
    }
  }  
}

function printIndex(baseFields: FieldDetails, groups: string[], outPath: string){
  /** The base fields belong at the top level, so remove them from the others for printing. */
  groups = groups.filter(item => item !== 'base');

  /** Printing the imports. */
  for (const group of groups) {
    const declaration = `import { ${group}Ecs } from './${group}';\n`;
    append(`${outPath}/index.ts`, declaration);
  }

  /** Printing the ecs object */
  var schema = `\nexport const ecsSchema = {\n`;
  const baseFieldInfo = util.inspect(baseFields).slice(2, -2).concat(',\n');
  schema += baseFieldInfo;
  for (const group of groups) {
    schema += `  ${group}Ecs,\n`;
  }
  schema += '};';

  append(`${outPath}/index.ts`, schema);
}

function write(filePath: string, content: string) {
  try {
    fs.writeFileSync(path.resolve(__dirname, filePath), content);
  } catch (e) {
    console.error(`Failed to write file to ${filePath}`);
    console.error(e);
    process.exit(1);
  }
}

function append(filePath: string, content: string) {
  try {
    fs.appendFileSync(path.resolve(__dirname, filePath), content);
  } catch (e) {
    console.error(`Failed to append to file to ${filePath}`);
    console.error(e);
    process.exit(1);
  }
}
