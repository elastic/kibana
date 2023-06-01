/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
/* eslint-disable no-console */
import globby from 'globby';
import * as fs from 'fs';
import yaml from 'js-yaml';
import { Config, bundle, LocationObject } from '@redocly/openapi-core';
import path from 'path';

export interface OpenAPISpec {
  $ref?: string;
  [key: string]: any;
}

const BASIC_CONFIG = {
  resolve: {
    http: {
      headers: [],
      customFetch() {},
    },
  },
  apis: {
    api1: {
      root: '',
      styleguide: {
        extendPaths: [],
        pluginPaths: [],
      },
    },
  },
  styleguide: {
    extendPaths: [],
    pluginPaths: [],
  },
};

export function loadYamlFile(filePath: string): OpenAPISpec {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return yaml.safeLoad(fileContent) as OpenAPISpec;
}

function getValueFromPath(obj: OpenAPISpec, _path: string) {
  if (_path.startsWith('#/')) {
    _path = _path.substring(2);
  }
  // redocly uses ~1 for / in _paths, for example application/json is valid
  const _paths = _path.split('/').map((p: string) => p.replace('~1', '/'));
  let current = obj;

  for (let i = 0; i < _paths.length; i++) {
    if (current[_paths[i]] === undefined) {
      return undefined;
    } else {
      current = current[_paths[i]];
    }
  }

  return current;
}

const getDefinition = (location: LocationObject) => {
  if (!location.pointer) return undefined;
  const spec = loadYamlFile(location.source.absoluteRef);
  return getValueFromPath(spec, location.pointer);
};

function replaceRef(obj: OpenAPISpec, oldRef: string, newRef: string): void {
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      replaceRef(obj[key], oldRef, newRef);
    } else if (key === '$ref' && obj[key] === oldRef) {
      obj[key] = newRef;
    }
  }
}

export const docLinker = async ({ sourceDir = './openapi' }: { sourceDir: string }) => {
  const entryPointFiles = await globby([`${sourceDir}/**/entrypoint.yaml`]);
  const yamlFiles = await globby([
    `${sourceDir}/**/*.yaml`,
    '!**/entrypoint.yaml',
    '!**/bundle.yaml',
  ]);

  entryPointFiles.forEach((entryPointFile: string) => {
    if (!entryPointFile.endsWith('entrypoint.yaml')) return;

    const ref = path.join(process.cwd(), entryPointFile);
    console.log(`Linking ${ref}`);

    bundle({
      ref,
      config: new Config(BASIC_CONFIG),
      dereference: false,
    })
      .then((result) => {
        result.problems.forEach((problem) => {
          if (problem.message !== "Can't resolve $ref") return;

          problem.location.forEach((location) => {
            if (!location.pointer) return;

            const definitionPath = getDefinition(location);
            if (!definitionPath || !definitionPath.$ref) return;

            const missingDefinition = definitionPath.$ref.split('/').slice(-1)[0];

            const found = yamlFiles.some((file: string) => {
              if (!file.endsWith(`${missingDefinition}.yaml`)) return false;

              const relativePath = path.relative(path.dirname(location.source.absoluteRef), file);

              const spec = loadYamlFile(location.source.absoluteRef);
              const definition = getValueFromPath(spec, location.pointer);
              if (definition && definition.$ref) {
                console.log(
                  `Replacing ${definition.$ref} to ${relativePath} in ${location.source.absoluteRef}`
                );
                replaceRef(spec, definition.$ref, relativePath);

                const yamlContent = yaml.safeDump(spec);
                fs.writeFileSync(location.source.absoluteRef, yamlContent, 'utf8');
              }

              return true;
            });

            if (!found) {
              console.error('Unknown error, run @readcly/cli for details');
              process.exit(1);
            }
          });
        });
      })
      .catch((error) => {
        console.log('catched it', error);
      });
  });
};
