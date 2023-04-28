/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import path from 'path';
import { set } from '@kbn/safer-lodash-set';
import { get } from 'lodash';
import { FieldMap } from '../..';
import { createLineWriter, LineWriter } from './lib/line_writer';

const PLUGIN_DIR = path.resolve(path.join(__dirname, '..'));

export const createSchemaFromFieldMap = (
  outputFile: string,
  fieldMap: FieldMap,
  schemaPrefix: string,
  useAlert: boolean = false,
  useEcs: boolean = false,
  useLegacyAlerts: boolean = false
) => {
  const lineWriters = {
    IMPORTS: createLineWriter(),
    REQUIRED_FIELDS_FLATTENED: createLineWriter(),
    OPTIONAL_FIELDS_FLATTENED: createLineWriter(),
    REQUIRED_FIELDS_UNFLATTENED: createLineWriter(),
    OPTIONAL_FIELDS_UNFLATTENED: createLineWriter(),
    INCLUDED_SCHEMAS_FLATTENED: createLineWriter(''),
    INCLUDED_SCHEMAS_UNFLATTENED: createLineWriter(''),
  };

  if (useAlert) {
    lineWriters.IMPORTS.addLine(
      `import { AlertFlattenedSchema, AlertSchema } from './alert_schema';`
    );
    lineWriters.INCLUDED_SCHEMAS_FLATTENED.addLine(`, AlertFlattenedSchema`);
    lineWriters.INCLUDED_SCHEMAS_UNFLATTENED.addLine(`, AlertSchema`);
  }

  if (useEcs) {
    lineWriters.IMPORTS.addLine(`import { EcsFlattenedSchema, EcsSchema } from './ecs_schema';`);
    lineWriters.INCLUDED_SCHEMAS_FLATTENED.addLine(`, EcsFlattenedSchema`);
    lineWriters.INCLUDED_SCHEMAS_UNFLATTENED.addLine(`, EcsSchema`);
  }
  if (useLegacyAlerts) {
    lineWriters.IMPORTS.addLine(
      `import { LegacyAlertFlattenedSchema, LegacyAlertSchema } from './legacy_alert_schema';`
    );
    lineWriters.INCLUDED_SCHEMAS_FLATTENED.addLine(`, LegacyAlertFlattenedSchema`);
    lineWriters.INCLUDED_SCHEMAS_UNFLATTENED.addLine(`, LegacyAlertSchema`);
  }

  generateSchemaFromFieldMap({ lineWriters, fieldMap });

  const contents = getSchemaFileContents(lineWriters, schemaPrefix);

  writeGeneratedFile(outputFile, `${contents}\n`);
};

interface GenerateSchemaFromFieldMapOpts {
  lineWriters: Record<string, LineWriter>;
  fieldMap: FieldMap;
}
const generateSchemaFromFieldMap = ({ lineWriters, fieldMap }: GenerateSchemaFromFieldMapOpts) => {
  const requiredFieldMap = { properties: {} };
  const optionalFieldMap = { properties: {} };

  const getKeyWithProperties = (key: string) => key.split('.').join('.properties.');

  // Generate required properties
  Object.keys(fieldMap)
    .filter((key: string) => fieldMap[key].required === true)
    .map((key: string) =>
      set(requiredFieldMap.properties, getKeyWithProperties(key), fieldMap[key])
    );
  generateSchemaLines({
    lineWriter: lineWriters.REQUIRED_FIELDS_FLATTENED,
    propertyKey: null,
    required: true,
    flattened: true,
    fieldMap: requiredFieldMap,
  });
  generateSchemaLines({
    lineWriter: lineWriters.REQUIRED_FIELDS_UNFLATTENED,
    propertyKey: null,
    required: true,
    flattened: false,
    fieldMap: requiredFieldMap,
  });

  // Generate optional properties
  Object.keys(fieldMap)
    .filter((key: string) => fieldMap[key].required !== true)
    .map((key: string) =>
      set(optionalFieldMap.properties, getKeyWithProperties(key), fieldMap[key])
    );
  generateSchemaLines({
    lineWriter: lineWriters.OPTIONAL_FIELDS_FLATTENED,
    propertyKey: null,
    required: false,
    flattened: true,
    fieldMap: optionalFieldMap,
  });
  generateSchemaLines({
    lineWriter: lineWriters.OPTIONAL_FIELDS_UNFLATTENED,
    propertyKey: null,
    required: false,
    flattened: false,
    fieldMap: optionalFieldMap,
  });
};
interface FieldMapProperty {
  properties: Record<string, FieldMapProperty>;
}

interface GenerateSchemaLinesOpts {
  lineWriter: LineWriter;
  propertyKey: string | null;
  required: boolean;
  flattened: boolean;
  fieldMap: {
    properties: Record<string, FieldMapProperty>;
  };
}

const getSchemaDefinition = (schemaPrefix: string, isArray: boolean): string => {
  if (isArray) {
    schemaPrefix = `${schemaPrefix}Array`;
  }
  return schemaPrefix;
};

const generateSchemaLines = ({
  fieldMap,
  propertyKey,
  lineWriter,
  required,
  flattened,
}: GenerateSchemaLinesOpts) => {
  if (fieldMap == null) return;

  const type = get(fieldMap, 'type');
  const isArray = get(fieldMap, 'array', false);
  const isEnabled = get(fieldMap, 'enabled', true);

  let keyToWrite = propertyKey;
  if (propertyKey?.includes('.') || propertyKey?.includes('@')) {
    keyToWrite = `'${propertyKey}'`;
  }

  if (null != type) {
    switch (type) {
      case 'flattened':
        lineWriter.addLine(`${keyToWrite}: ${getSchemaDefinition('schemaUnknown', isArray)},`);
        break;
      case 'object':
      case 'nested':
        if (!isEnabled) {
          lineWriter.addLine(`${keyToWrite}: ${getSchemaDefinition('schemaUnknown', isArray)},`);
        } else if (isArray && null != fieldMap.properties) {
          lineWriter.addLineAndIndent(`${keyToWrite}: rt.array(`);
          if (required) {
            lineWriter.addLineAndIndent(`rt.type({`);
          } else {
            lineWriter.addLineAndIndent(`rt.partial({`);
          }
          for (const prop of Object.keys(fieldMap.properties).sort()) {
            generateSchemaLines({
              lineWriter,
              propertyKey: prop,
              required,
              fieldMap: fieldMap.properties[prop],
              flattened,
            });
          }
          lineWriter.dedentAndAddLine(`})`);
          lineWriter.dedentAndAddLine(`),`);
        }
        break;
      case 'keyword':
      case 'ip':
      case 'constant_keyword':
      case 'match_only_text':
      case 'text':
      case 'version':
      case 'wildcard':
        lineWriter.addLine(`${keyToWrite}: ${getSchemaDefinition('schemaString', isArray)},`);
        break;
      case 'date':
        lineWriter.addLine(`${keyToWrite}: ${getSchemaDefinition('schemaDate', isArray)},`);
        break;
      case 'date_range':
        lineWriter.addLine(`${keyToWrite}: ${getSchemaDefinition('schemaDateRange', isArray)},`);
        break;
      case 'geo_point':
        lineWriter.addLine(`${keyToWrite}: ${getSchemaDefinition('schemaGeoPoint', isArray)},`);
        break;
      case 'long':
      case 'scaled_float':
        lineWriter.addLine(
          `${keyToWrite}: ${getSchemaDefinition('schemaStringOrNumber', isArray)},`
        );
        break;
      case 'float':
      case 'integer':
        lineWriter.addLine(`${keyToWrite}: ${getSchemaDefinition('schemaNumber', isArray)},`);
        break;
      case 'boolean':
        lineWriter.addLine(`${keyToWrite}: ${getSchemaDefinition('schemaBoolean', isArray)},`);
        break;
      case 'alias':
        if (!flattened) {
          lineWriter.addLine(`${keyToWrite}: ${getSchemaDefinition('schemaUnknown', isArray)},`);
        }
        break;
      default:
        logError(`unknown type ${type}: ${JSON.stringify(fieldMap)}`);
        break;
    }

    return;
  }

  if (null == get(fieldMap, 'properties')) {
    logError(`unknown properties ${propertyKey}: ${JSON.stringify(fieldMap)}`);
  }

  if (null == propertyKey) {
    if (required) {
      lineWriter.addLineAndIndent(`rt.type({`);
    } else {
      lineWriter.addLineAndIndent(`rt.partial({`);
    }
  } else if (!flattened) {
    if (required) {
      lineWriter.addLineAndIndent(`${propertyKey}: rt.type({`);
    } else {
      lineWriter.addLineAndIndent(`${propertyKey}: rt.partial({`);
    }
  }

  // write the object properties
  for (const prop of Object.keys(fieldMap.properties).sort()) {
    const key = propertyKey && flattened ? `${propertyKey}.${prop}` : prop;
    generateSchemaLines({
      lineWriter,
      propertyKey: key,
      required,
      flattened,
      fieldMap: fieldMap.properties[prop],
    });
  }

  if (null == propertyKey || !flattened) {
    lineWriter.dedentAndAddLine(`}),`);
  }
};

const SchemaFileTemplate = `
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
// ---------------------------------- WARNING ----------------------------------
// this file was generated, and should not be edited by hand
// ---------------------------------- WARNING ----------------------------------
import * as rt from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
%%IMPORTS%%
const ISO_DATE_PATTERN = /^d{4}-d{2}-d{2}Td{2}:d{2}:d{2}.d{3}Z$/;
export const IsoDateString = new rt.Type<string, string, unknown>(
  'IsoDateString',
  rt.string.is,
  (input, context): Either<rt.Errors, string> => {
    if (typeof input === 'string' && ISO_DATE_PATTERN.test(input)) {
      return rt.success(input);
    } else {
      return rt.failure(input, context);
    }
  },
  rt.identity
);
export type IsoDateStringC = typeof IsoDateString;
export const schemaDate = IsoDateString;
export const schemaDateArray = rt.array(IsoDateString);
export const schemaDateRange = rt.partial({
  gte: schemaDate,
  lte: schemaDate,
});
export const schemaDateRangeArray = rt.array(schemaDateRange);
export const schemaUnknown = rt.unknown;
export const schemaUnknownArray = rt.array(rt.unknown);
export const schemaString = rt.string;
export const schemaStringArray = rt.array(schemaString);
export const schemaNumber = rt.number;
export const schemaNumberArray = rt.array(schemaNumber);
export const schemaStringOrNumber = rt.union([schemaString, schemaNumber]);
export const schemaStringOrNumberArray = rt.array(schemaStringOrNumber);
export const schemaBoolean = rt.boolean;
export const schemaBooleanArray = rt.array(schemaBoolean);
const schemaGeoPointCoords = rt.type({
  type: schemaString,
  coordinates: schemaNumberArray,
});
const schemaGeoPointString = schemaString;
const schemaGeoPointLatLon = rt.type({
  lat: schemaNumber,
  lon: schemaNumber,
});
const schemaGeoPointLocation = rt.type({
  location: schemaNumberArray,
});
const schemaGeoPointLocationString = rt.type({
  location: schemaString,
});
export const schemaGeoPoint = rt.union([
  schemaGeoPointCoords,
  schemaGeoPointString,
  schemaGeoPointLatLon,
  schemaGeoPointLocation,
  schemaGeoPointLocationString,
]);
export const schemaGeoPointArray = rt.array(schemaGeoPoint);
// prettier-ignore
const %%schemaPrefix%%RequiredFlattened = %%REQUIRED_FIELDS_FLATTENED%%;
const %%schemaPrefix%%OptionalFlattened = %%OPTIONAL_FIELDS_FLATTENED%%;
// prettier-ignore
const %%schemaPrefix%%Required = %%REQUIRED_FIELDS_UNFLATTENED%%;
const %%schemaPrefix%%Optional = %%OPTIONAL_FIELDS_UNFLATTENED%%;

// prettier-ignore
export const %%schemaPrefix%%FlattenedSchema = rt.intersection([%%schemaPrefix%%RequiredFlattened, %%schemaPrefix%%OptionalFlattened%%INCLUDED_SCHEMAS_FLATTENED%%]);
// prettier-ignore
export type %%schemaPrefix%%Flattened = rt.TypeOf<typeof %%schemaPrefix%%FlattenedSchema>;

// prettier-ignore
export const %%schemaPrefix%%Schema = rt.intersection([%%schemaPrefix%%Required, %%schemaPrefix%%Optional%%INCLUDED_SCHEMAS_UNFLATTENED%%]);
// prettier-ignore
export type %%schemaPrefix%% = rt.TypeOf<typeof %%schemaPrefix%%Schema>;

`.trim();

const getSchemaFileContents = (lineWriters: Record<string, LineWriter>, schemaPrefix: string) => {
  return Object.keys(lineWriters).reduce((currTemplate, key) => {
    const schemaLines = lineWriters[key].getContent().replace(/,$/, '');
    return currTemplate
      .replaceAll(`%%schemaPrefix%%`, schemaPrefix)
      .replace(`%%${key}%%`, schemaLines);
  }, SchemaFileTemplate);
};

const writeGeneratedFile = (fileName: string, contents: string) => {
  const genFileName = path.join(PLUGIN_DIR, fileName);
  try {
    fs.writeFileSync(genFileName, contents);
  } catch (err) {
    logError(`error writing file: ${genFileName}: ${err.message}`);
  }
};

const logError = (message: string) => {
  // eslint-disable-next-line no-console
  console.log(`error: ${message}`);
  process.exit(1);
};
