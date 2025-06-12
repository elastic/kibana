/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createProgram,
  findConfigFile,
  forEachChild,
  isFunctionDeclaration,
  isMethodDeclaration,
  isArrowFunction,
  isVariableDeclaration,
  parseJsonConfigFileContent,
  readConfigFile,
  SourceFile,
  sys,
} from 'typescript';
import { parentPort, MessagePort } from 'worker_threads';
import * as fs from 'fs';
import * as path from 'path';
import { FunctionInfo } from '.';

const debug = process.env.NODE_ENV === 'dev';

const ES_HOST = 'http://localhost:9200';
const INDEX_NAME = 'kibana-ast';
const AUTH = Buffer.from('elastic:changeme').toString('base64');

const cwd = process.cwd();

parentPort?.on('message', async ({ action, data }) => {
  try {
    const { directory, id, map } = data;

    if (action === 'processPackage') {
      await processPackage(directory, id, map);
      process.exit(0);
    }
  } catch (error) {
    log({ type: 'error', msg: `worker error: ${error}` });
  }
});

export async function processPackage(directory: string, id: string, map: Array<[string, string]>) {
  const files = getAllFiles(directory);

  const processedFilesMap = new Map(map);

  if (files.length === 0) {
    log({
      type: 'done',
      id,
      stat: `No .ts or .tsx files found in ${directory}.`,
    });

    return;
  }

  const configPath = findConfigFile(directory, sys.fileExists, 'tsconfig.json');

  if (!configPath) throw new Error('Could not find a valid tsconfig.json');

  const rootDirectory = process.cwd();

  log({ type: 'create', id, msg: `Creating program for ${id}` });

  const configFile = readConfigFile(configPath, sys.readFile);

  const parsed = parseJsonConfigFileContent(configFile.config, sys, rootDirectory);

  const program = createProgram({
    rootNames: files,
    options: { ...parsed.options, noEmit: true },
  });

  const sourceFiles = program.getSourceFiles();

  log({ type: 'total', total: sourceFiles.length });

  const packageMap = new Map<string, [string, string]>();

  for (const sourceFile of sourceFiles) {
    const fileName = path.relative(cwd, sourceFile.fileName);

    log({ type: 'processFile', msg: `Processing ${fileName}` });

    if (sourceFile.fileName.includes('node_modules')) continue;
    if (sourceFile.fileName.includes('.d.ts')) continue;

    if (processedFilesMap.has(fileName)) {
      log({ type: 'foundDuplicate', filePath: fileName });
      continue;
    }

    const functions = extractFunctionInfo({ sourceFile, map: packageMap }) || [];

    for (const func of functions) {
      await queueFunctionForBulkUpload(func, parentPort);
    }
  }

  log({ type: 'done', id });
}

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

export function extractFunctionInfo({
  sourceFile,
  map,
}: {
  sourceFile: SourceFile;
  map: Map<string, [string, string]>;
}) {
  const functions: FunctionInfo[] = [];
  const fileName = path.relative(cwd, sourceFile.fileName);

  log({ type: 'update', msg: `Extracting functions from ${fileName}` });

  function getFunctionName(node: any): string {
    // Direct function declarations and methods
    if (isFunctionDeclaration(node) || isMethodDeclaration(node)) {
      return node.name?.getText(sourceFile) || 'anonymous';
    }

    // Arrow functions assigned to variables
    if (isVariableDeclaration(node) && node.initializer && isArrowFunction(node.initializer)) {
      return node.name?.getText(sourceFile) || 'anonymous';
    }

    // Standalone arrow functions
    if (isArrowFunction(node)) {
      return 'anonymous';
    }

    return 'unknown';
  }

  function visit(node: any) {
    if (
      isFunctionDeclaration(node) ||
      isMethodDeclaration(node) ||
      isArrowFunction(node) ||
      (isVariableDeclaration(node) && node.initializer && isArrowFunction(node.initializer))
    ) {
      const functionName = getFunctionName(node);

      const id = `${fileName.replaceAll('/', '-')}_${functionName}`;

      if (map.has(id)) return;

      map.set(id, [fileName, functionName]);

      const startPos = node.getStart(sourceFile);

      const { line } = sourceFile.getLineAndCharacterOfPosition(startPos);
      const returnType = node.type ? node.type.getText(sourceFile) : 'void';

      let functionDescription = `'${functionName.replace(
        /([a-z])([A-Z])/g,
        '$1 $2'
      )}' is a function that returns`;

      if (node.type) {
        functionDescription += ` a value of type '${returnType}'.`;
      } else {
        functionDescription += ' a value of unknown type.';
      }

      let functionNode;

      if (isFunctionDeclaration(node) || isMethodDeclaration(node) || isArrowFunction(node)) {
        functionNode = node;
      } else if (
        isVariableDeclaration(node) &&
        node.initializer &&
        isArrowFunction(node.initializer)
      ) {
        functionNode = node.initializer;
      }

      const info = {
        id,
        name: functionName,
        functionDescription,
        startLine: line,
        filePath: path.relative(cwd, sourceFile.fileName),
        parameters: functionNode?.parameters.map((param: any) => ({
          name: param.name ? param.name.getText(sourceFile) : 'anonymous',
          type: param.type?.getText(sourceFile),
          optional: !!param.questionToken,
        })),
        returnType,
        fullText: node.getText(sourceFile),
        normalizedCode: normalizeKibanaCode(node.getText(sourceFile)),
        astFeatures: {},
      };

      functions.push(info);
    }

    forEachChild(node, visit);
  }

  visit(sourceFile);

  return functions;
}

function normalizeKibanaCode(codeText: string): string {
  let normalized = codeText;
  normalized = normalized.replace(/use[A-Z][a-zA-Z]*/g, 'useHOOK');
  normalized = normalized.replace(/\w+\.kibana\.\w+/g, 'kibana.API');
  normalized = normalized.replace(/\w+\.(vis|visualization)\.\w+/g, 'vis.API');
  normalized = normalized.replace(/(must|should|filter|must_not):\s*\[/g, 'QUERY_CLAUSE: [');
  normalized = normalized.replace(/\w+\.(buckets|aggregations|hits)\./g, 'data.STRUCTURE.');
  return normalizeCode(normalized);
}

function normalizeCode(codeText: string): string {
  let normalized = codeText;

  normalized = normalized.replace(/\s+/g, ' ').trim();

  const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while'];

  normalized = normalized.replace(/\b[a-z][a-zA-Z0-9]*\b/g, (match) => {
    if (keywords.includes(match)) return match;
    return 'VAR';
  });

  normalized = normalized.replace(/"[^"]*"/g, '"STRING"');
  normalized = normalized.replace(/'[^']*'/g, "'STRING'");
  normalized = normalized.replace(/\b\d+(\.\d+)?\b/g, 'NUMBER');
  normalized = normalized.replace(/\/\*[\s\S]*?\*\//g, '');
  normalized = normalized.replace(/\/\/.*$/gm, '');

  return normalized;
}

const BULK_BATCH_SIZE = 10;
const bulkQueue: FunctionInfo[] = [];

async function queueFunctionForBulkUpload(func: FunctionInfo, messagePort: MessagePort | null) {
  bulkQueue.push(func);

  if (bulkQueue.length >= BULK_BATCH_SIZE) {
    await flushBulkQueue(messagePort);
  }
}

// Call this one final time after everything is processed
async function flushBulkQueue(messagePort?: MessagePort | null) {
  if (bulkQueue.length === 0) return;

  const bulkBody = bulkQueue.flatMap((func) => {
    const { id, ...rest } = func;
    return [{ index: { _index: INDEX_NAME, _id: id } }, rest];
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
    log({
      type: 'error',
      msg: `Failed to bulk upload functions: ${res.status} - ${res.statusText}`,
    });
  }

  bulkQueue.length = 0; // Clear queue
}

function log(args: any) {
  if (debug) {
    // eslint-disable-next-line no-console
    console.log(`[Worker]`, args);
  } else {
    parentPort?.postMessage(args);
  }
}
