/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreemen Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseSync, Function } from 'oxc-parser';

import { Node, TypeChecker, isVariableStatement } from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import * as cliProgress from 'cli-progress';
import { getPackages } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';
// import { extractSchemaFromType } from './extract_schema_from_type';

const ES_HOST = 'http://localhost:9200';
const INDEX_NAME = 'kibana-ast';
const AUTH = Buffer.from('elastic:changeme').toString('base64');

const cwd = process.cwd();

const startTime = Date.now();

const map = new Map<string, string[]>();

export async function generateAST() {
  log('Generating AST for Kibana files...');

  await createIndexInElasticsearch();

  const packages = getPackages(REPO_ROOT);

  if (packages.length === 0) {
    log('No packages found in the repository.');
    return;
  }

  const filtered = packages.filter((pkg) =>
    pkg.directory.includes('x-pack/solutions/observability')
  );
  const progressBar = new cliProgress.MultiBar(
    {
      format: ' {bar} | {name} | {value}/{total} | {foo} | {duration}s',
      forceRedraw: true,
    },
    cliProgress.Presets.shades_classic
  );

  const packagesProgress = progressBar.create(filtered.length, 0);
  const filesProgress = progressBar.create(0, 0);

  for (const { directory, manifest, id } of filtered) {
    packagesProgress.increment(1, { name: id, foo: '' });

    const files = getAllFiles(directory);

    filesProgress.setTotal(files.length);
    filesProgress.update(0);

    if (files.length === 0) {
      log('No .ts or .tsx files found in the specified directory.');
      return;
    }

    for (const file of files) {
      filesProgress.increment(1, {
        name: path.relative(cwd, file),
        foo: '',
      });
      // log(`Found file: ${file}`);

      const contents = fs.readFileSync(file).toString();

      // const result = parseSync(file, contents);
      const result = parseSync(file, contents);

      for (const node of result.program.body) {
        const fileName = path.relative(cwd, file);
        if (node.type === 'ExportNamedDeclaration') {
          const declaration = node.declaration;
          if (!declaration) continue;

          if (declaration.type === 'FunctionDeclaration' && declaration.id) {
            const functionName = declaration.id.name;
            // log(`Found function: ${functionName} in file: ${file}`);
            // await handleFunction(functionName, node, result.program, kibanaConfigParsed.raw.id);
            filesProgress.update({
              foo: `Processing function ${functionName}`,
            });
            await handleFunction({
              fileName,
              packageName: manifest.id,
              functionName,
              node: declaration,
              sourceFile: contents,
              progress: filesProgress,
            });
          }
        }

        if (node.type === 'FunctionDeclaration' && node.id) {
          const functionName = node.id.name;
          // log(`Found function: ${functionName} in file: ${file}`);
          // await handleFunction(functionName, node, result.program, kibanaConfigParsed.raw.id);
          filesProgress.update({
            foo: `Processing function ${functionName}`,
          });
          await handleFunction({
            fileName,
            packageName: manifest.id,
            functionName,
            node,
            sourceFile: contents,
            progress: filesProgress,
          });
        }

        if (node.type === 'VariableDeclaration') {
          if (node.declarations.length === 0) continue;
          if (
            node.declarations.length > 1 &&
            node.declarations[0].type === 'VariableDeclarator' &&
            node.declarations[0].init?.type === 'ArrowFunctionExpression'
          ) {
            const variableDeclaration = node.declarations[0];
            const functionName =
              variableDeclaration.id.type === 'Identifier'
                ? variableDeclaration.id.name
                : '<unknown>';

            filesProgress.update({
              foo: `Processing function ${functionName}`,
            });
            await handleFunction({
              fileName,
              functionName,
              node: variableDeclaration.init as Function,
              sourceFile: contents,
              packageName: manifest.id,
              progress: filesProgress,
              // checker: result.program.getTypeChecker(),
            });
          }
        }
      }
    }

    // const program = createProgram({
    //   // rootNames: ['./x-pack/solutions/observability/plugins/apm/public/utils/build_url.ts'],
    //   // rootNames: ['./src/core/packages/application/browser-internal/src/utils/append_app_path.ts'],
    //   // rootNames: ['./src/platform/packages/shared/kbn-config-schema/src/byte_size_value/index.ts'],
    //   rootNames: files,
    //   options: parsed.options,
    // });

    // const checker = program.getTypeChecker();

    // for (const sourceFile of program.getSourceFiles()) {
    //   if (sourceFile.fileName.includes('node_modules')) continue;
    //   if (sourceFile.fileName.includes('.d.ts')) continue;

    //   log(`Processing file: ${sourceFile.fileName}`);

    //   // Use an async recursive visitor
    //   await visitAsync(sourceFile, sourceFile, checker, kibanaConfigParsed.raw.id);

    //   const used = process.memoryUsage().heapUsed / 1024 / 1024;
    //   log(`Memory used: ${used.toFixed(2)} MB`);
    // }
  }

  progressBar.stop();
}

function findEnclosingVariableStatement(node: Node): Node | undefined {
  let current: Node | undefined = node;
  while (current) {
    if (isVariableStatement(current)) {
      return current;
    }
    current = current.parent;
  }
  return undefined;
}

// Get all .ts and .tsx files
function getAllFiles(dir: string): string[] {
  return fs.readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    return fs.statSync(fullPath).isDirectory()
      ? getAllFiles(fullPath)
      : /\.(ts|tsx)$/.test(fullPath)
      ? [fullPath]
      : [];
  });
}

interface FunctionInfo {
  id: string;
  file: string;
  line: number;
  functionName: string;
  functionIntent: string;
  functionDescription: string;
  packageName: string;
  parameters?: Record<string, any>;
  returnType?: any;
}

async function handleFunction({
  fileName,
  functionName,
  node,
  sourceFile,
  checker,
  packageName,
  progress,
}: {
  fileName: string;
  functionName: string;
  sourceFile: string;
  packageName: string;
  node?: Function;
  checker?: TypeChecker;
  progress: cliProgress.SingleBar;
}) {
  const id = `${fileName.replaceAll('/', '-')}_${functionName}`;

  if (map.has(id)) {
    // log(`Skipping duplicate function: ${functionName} in ${fileName}`);
    return;
  }

  map.set(id, [fileName, functionName]);

  // const signature = checker.getSignatureFromDeclaration(node as SignatureDeclaration);

  // if (!signature) return;

  // const returnType = checker.getReturnTypeOfSignature(signature);

  // const returnSchema = extractSchemaFromType({
  //   type: returnType,
  //   checker,
  //   includeRequired: false,
  //   seen: new Map(),
  //   depth: 0,
  // });

  // const paramSchemas: Record<string, any> = {};

  // for (const param of node.parameters) {
  // const paramSymbol = checker.getSymbolAtLocation(param.name);

  // if (!paramSymbol) continue;

  // const paramType = checker.getTypeOfSymbolAtLocation(paramSymbol, param);

  //   paramSchemas[paramSymbol.getName()] = extractSchemaFromType({
  //     type: paramType,
  //     checker,
  //     includeRequired: false,
  //     seen: new Map(),
  //     depth: 0,
  //   });
  // }
  const functionCode = sourceFile.slice(node?.start, node?.end);

  const foo = await callOllama(functionName, functionCode, progress);

  const { intent, description }: { intent: string; description: string } = foo;

  const func = {
    id,
    file: fileName,
    functionName,
    functionIntent: intent,
    functionDescription: description,
    packageName,
    line: node?.start ?? 0,
    // parameters: paramSchemas,
    // returnType: returnSchema,
  };

  await queueFunctionForBulkUpload(func);
}

function log(...args: any) {
  // eslint-disable-next-line no-console
  console.log(...args);
}

const BULK_BATCH_SIZE = 10;
const bulkQueue: FunctionInfo[] = [];

async function queueFunctionForBulkUpload(func: FunctionInfo) {
  bulkQueue.push(func);
  if (bulkQueue.length >= BULK_BATCH_SIZE) {
    await flushBulkQueue();
  }
}

// Call this one final time after everything is processed
async function flushBulkQueue(progress?: cliProgress.SingleBar) {
  if (bulkQueue.length === 0) return;

  const bulkBody = bulkQueue.flatMap((func) => {
    const { id, ...rest } = func;
    return [{ index: { _index: INDEX_NAME, _id: id } }, rest];
  });

  progress?.update({
    foo: `Flushing ${bulkQueue.length} functions to ES...`,
  });
  const res = await fetch(`${ES_HOST}/_bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-ndjson',
      Authorization: `Basic ${AUTH}`,
    },
    body: bulkBody.map((line) => JSON.stringify(line)).join('\n') + '\n',
  });

  if (!res.ok) {
    const error = await res.text();
    // log(`Failed to bulk upload. Status: ${res.status} - ${res.statusText}`);
    progress?.update({
      foo: `Failed to bulk upload functions: ${res.status} - ${res.statusText}`,
    });
    log(error);
  } else {
    // log(`Uploaded ${bulkQueue.length} functions in bulk`);
    progress?.update({
      foo: `Uploaded ${bulkQueue.length} functions in bulk`,
    });
  }

  bulkQueue.length = 0; // Clear queue
}

async function callOllama(
  functionName: string,
  functionCode: string,
  progress?: cliProgress.SingleBar
) {
  progress?.update({ foo: `Summarizing function ${functionName}...` });
  const start = Date.now();
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'devstral:latest',
      prompt: `Here is a typescript function:
        ${functionCode}

        Summarize this function.

        Please provide the following information as **strict JSON**.
        
        The JSON should include: 
        - "intent" (string): a concise description of the intent of the function. Start with "${functionName} is a function that ..." . Do not use more than 150 characters.>
        - "description" (string) A detailed description of the function. Include the parameters and return variable names in your answer. Keep it to a maximum of 350 characters.

        **Important:** 
        - Do not include any explanations.
        - DO NOT include your thinking process.
        - NEVER include the function code in the response.
        - Make sure the JSON is valid and parseable.
        - Do not wrap the JSON in any other format, such as markdown or code blocks.

        Correct:
        {
          "intent": "getVariables is a function that returns default variables with optional overrides.",
          "description": "This function takes an optional array of feature IDs as input, checks their compatibility with AllAvailableConnectorFeatures, and returns the resulting set of compatible connector features.",
        }

        Incorrect:
        \`\`\`json
        {
          "intent": "getVariables is a function that returns default variables with optional overrides.",
          "description": "This function takes an optional array of feature IDs as input, checks their compatibility with AllAvailableConnectorFeatures, and returns the resulting set of compatible connector features.",
        }
        \`\`\`
        `,

      stream: false,
    }),
  });

  const data = await response.json();

  try {
    const parsed = JSON.parse(data.response);
    if (typeof parsed.intent !== 'string' || typeof parsed.description !== 'string') {
      throw new Error('Invalid response format from Ollama');
    }
    const end = Date.now();
    const elapsed = ((end - start) / 1000).toFixed(2);
    progress?.update({ foo: `Got a summary in ${elapsed}s` });
    return parsed;
  } catch (error) {
    log(`Error parsing Ollama response for ${functionName}:`, error);
    return {
      intent: `Failed to parse intent for ${functionName}`,
      description: `Failed to parse description for ${functionName}`,
    };
  }
}

async function createIndexInElasticsearch() {
  const indexExists = await fetch(`${ES_HOST}/${INDEX_NAME}`, {
    method: 'HEAD',
    headers: {
      Authorization: `Basic ${AUTH}`,
    },
  });

  if (indexExists.status === 200) {
    log(`Index ${INDEX_NAME} already exists.`);

    const deleteIndexResponse = await fetch(`${ES_HOST}/${INDEX_NAME}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Basic ${AUTH}`,
      },
    });
    if (!deleteIndexResponse.ok) {
      throw new Error(
        `Failed to delete index ${INDEX_NAME}: [${deleteIndexResponse.statusText}]:
        ${await deleteIndexResponse.json()}`
      );
    }

    log(`Index ${INDEX_NAME} deleted successfully.`);
  }

  const createIndexResponse = await fetch(`${ES_HOST}/${INDEX_NAME}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${AUTH}`,
    },
    body: JSON.stringify({
      mappings: {
        properties: {
          functionDescription: {
            type: 'semantic_text',
          },
        },
      },
      settings: {
        'index.mapping.total_fields.limit': 100000,
        'index.mapping.depth.limit': 100,
      },
    }),
  });

  if (!createIndexResponse.ok) {
    throw new Error(
      `Failed to create index ${INDEX_NAME}: [${createIndexResponse.statusText}]:
      ${await createIndexResponse.json()}`
    );
  }

  log(`Index ${INDEX_NAME} created successfully.`);
}

generateAST().then(() => {
  const endTime = Date.now();
  const elapsedTime = ((endTime - startTime) / 1000).toFixed(2);
  log(`AST generation completed in ${elapsedTime} seconds`);
});
