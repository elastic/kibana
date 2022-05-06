/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import util from 'util';

import { GroupSchema, FieldDetails, TOP_LEVEL_NAME } from './common/types';
import { append, write } from './write_file';

export function printSchema(schema: GroupSchema, outPath: string) {
  printGroupFiles(schema, outPath);
  printIndex(schema[TOP_LEVEL_NAME], Object.keys(schema), outPath);
}

function printGroupFiles(schema: GroupSchema, outPath: string) {
  for (const group in schema) {    
    if (group !== TOP_LEVEL_NAME) {
      console.log(`Writing ${group} to ${outPath}/${group.toLowerCase()}.ts`);

      const details = `export const ${group}Ecs = ${util.inspect(schema[group])}`;
      write(`${outPath}/${group.toLowerCase()}.ts`, details);
    }
  }  
}

function printIndex(topLevelFields: FieldDetails, groups: string[], outPath: string){
  /** The base fields belong at the top level, so remove them from the others for printing. */
  groups = groups.filter(item => item !== TOP_LEVEL_NAME);

  /** Printing the imports. */
  for (const group of groups) {
    const declaration = `import { ${group}Ecs } from './${group}';\n`;
    append(`${outPath}/index.ts`, declaration);
  }

  /** Printing the ecs object */
  var schema = `\nexport const ecsSchema = {\n`;
  const baseFieldInfo = util.inspect(topLevelFields).slice(2, -2).concat(',\n');
  schema += baseFieldInfo;
  for (const group of groups) {
    schema += `  ${group}Ecs,\n`;
  }
  schema += '};';

  append(`${outPath}/index.ts`, schema);
}