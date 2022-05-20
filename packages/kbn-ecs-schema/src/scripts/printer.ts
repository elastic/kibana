/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import util from 'util';

import { Group, Schema, TOP_LEVEL_NAME } from '../common/types';
import { snakeCaseToCamelCase } from './helpers';
import { append, write } from './file_writer';

export function printSchema(schema: Schema, outPath: string) {
  printGroupFiles(schema, outPath);
  printIndex(schema[TOP_LEVEL_NAME], Object.keys(schema), outPath);
}

function printGroupFiles(schema: Schema, outPath: string) {
  for (const group in schema) {
    if (group !== TOP_LEVEL_NAME) {
      // eslint-disable-next-line no-console
      console.log(`Writing ${group} to ${outPath}/${group.toLowerCase()}.ts`);

      const details = `${header()}export const ${snakeCaseToCamelCase(group)}Ecs = ${util.inspect(
        schema[group],
        { depth: null }
      )}`;
      write(`${outPath}/${group.toLowerCase()}.ts`, details);
    }
  }
}

function printIndex(topLevelFields: Group, groups: string[], outPath: string) {
  /** The base fields belong at the top level, so remove them from the others for printing. */
  groups = groups.filter((item) => item !== TOP_LEVEL_NAME);

  append(`${outPath}/index.ts`, header());

  /** Printing the imports. */
  for (const group of groups) {
    const declaration = `import { ${snakeCaseToCamelCase(group)}Ecs } from './${group}';\n`;
    append(`${outPath}/index.ts`, declaration);
  }

  /** Printing the ecs object */
  let schema = `\nexport const ecsSchema = {\n`;
  const baseFieldInfo = util.inspect(topLevelFields).slice(2, -2).concat(',\n');
  schema += baseFieldInfo;
  for (const group of groups) {
    const groupInCamel = snakeCaseToCamelCase(group);
    schema += `  ${groupInCamel}\: {...${groupInCamel}Ecs},\n`;
  }
  schema += '};';

  append(`${outPath}/index.ts`, schema);
}

function header() {
  return `${copyright()}${disableLinting()}`;
}

function copyright(): string {
  return (
    '/*\n' +
    ' * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one\n' +
    ' * or more contributor license agreements. Licensed under the Elastic License\n' +
    ' * 2.0 and the Server Side Public License, v 1; you may not use this file except\n' +
    ' * in compliance with, at your election, the Elastic License 2.0 or the Server\n' +
    ' * Side Public License, v 1.\n' +
    ' */\n\n'
  );
}

function disableLinting(): string {
  return '/* eslint-disable */\n';
}
