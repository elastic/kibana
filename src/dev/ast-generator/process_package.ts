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
  isArrowFunction,
  isFunctionDeclaration,
  isIdentifier,
  isJsxElement,
  isJsxFragment,
  isJsxSelfClosingElement,
  isMethodDeclaration,
  isParenthesizedExpression,
  isReturnStatement,
  isVariableDeclaration,
  isVariableStatement,
  Node,
  parseJsonConfigFileContent,
  readConfigFile,
  SignatureDeclaration,
  SourceFile,
  sys,
  TypeChecker,
} from 'typescript';
import { parentPort } from 'worker_threads';
import * as fs from 'fs';
import * as path from 'path';
import { FunctionInfo } from '.';

const debug = process.env.NODE_ENV === 'dev';

const cwd = process.cwd();

let processedFilesMap = new Map();

parentPort?.on('message', async ({ action, data }) => {
  switch (action) {
    case 'processPackage':
      try {
        const { directory, id, map } = data;

        if (action === 'processPackage') {
          await processPackage(directory, id, map);
          process.exit(0);
        }
      } catch (error) {
        log({ type: 'error', msg: `Error: ${error}` });
      }
      break;

    case 'fileProcessed':
      // Only update if this worker didn't process the file
      if (!processedFilesMap.has(data.fileName)) {
        processedFilesMap.set(data.fileName, true);
      }
      break;
  }
});

export async function processPackage(directory: string, id: string, map: Array<[string, true]>) {
  const start = performance.now();

  const files = getAllFiles(directory);

  if (files.length === 0) {
    log({
      type: 'done',
      id,
      stat: `No .ts or .tsx files found in ${directory}.`,
    });

    return;
  }
  const rootFileNames = new Set(files.map((f) => path.resolve(f)));

  processedFilesMap = new Map(map);

  const configPath = findConfigFile(directory, sys.fileExists, 'tsconfig.json');

  if (!configPath) throw new Error('Could not find a valid tsconfig.json');

  const rootDirectory = process.cwd();

  log({ type: 'create', id, msg: `Creating program for ${id}...` });

  const configFile = readConfigFile(configPath, sys.readFile);

  const parsed = parseJsonConfigFileContent(configFile.config, sys, rootDirectory);

  const startCompile = performance.now();

  const program = createProgram({
    rootNames: files,
    options: { ...parsed.options, noEmit: true },
  });

  const endCompile = performance.now();

  const checker = program.getTypeChecker();

  const sourceFiles = program.getSourceFiles();

  const skippedFiles = sourceFiles.filter((sf) => !rootFileNames.has(path.resolve(sf.fileName)));

  log({ type: 'total', total: sourceFiles.length });

  const packageMap = new Map<string, [string, string]>();

  let counter = 0;

  for (const sourceFile of sourceFiles) {
    const fileName = path.relative(cwd, sourceFile.fileName);

    log({ type: 'processFile', fileName });

    if (sourceFile.fileName.includes('node_modules')) continue;
    if (sourceFile.fileName.includes('.d.ts')) continue;

    if (processedFilesMap.has(fileName)) {
      log({ type: 'foundDuplicate', filePath: fileName });
      continue;
    }

    const functions = extractFunctionInfo({ sourceFile, map: packageMap, checker });

    counter += functions.length;

    for (const func of functions) {
      await queueFunctionForBulkUpload(func);
    }
  }

  const end = performance.now();

  await uploadStats({
    id,
    name: id,
    filePath: path.relative(cwd, directory),
    totalFilesInPackage: files.length,
    totalSourceFiles: sourceFiles.length,
    totalFunctionsInPackage: counter,
    skippedFiles: skippedFiles.length,
    timeToCompile: endCompile - startCompile,
    timeToProcess: end - start,
  });

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

function getFunctionName(node: any, sourceFile: SourceFile): string {
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

  if (isVariableStatement(node)) {
    for (const decl of node.declarationList.declarations) {
      if (
        isVariableDeclaration(decl) &&
        decl.initializer &&
        isArrowFunction(decl.initializer) &&
        isIdentifier(decl.name)
      ) {
        return decl.name.text;
      }
    }
  }

  return 'noFunction';
}

export function extractFunctionInfo({
  sourceFile,
  map,
  checker,
}: {
  sourceFile: SourceFile;
  map: Map<string, [string, string]>;
  checker: TypeChecker;
}) {
  const fileName = path.relative(cwd, sourceFile.fileName);
  const functions: FunctionInfo[] = [];

  log({ type: 'update', msg: `Extracting functions from ${fileName}...` });

  function visit(node: Node) {
    if (
      isFunctionDeclaration(node) ||
      isMethodDeclaration(node) ||
      isArrowFunction(node) ||
      isVariableStatement(node)
    ) {
      const functionName = getFunctionName(node, sourceFile);
      if (functionName === 'noFunction') return;

      let functionNode: SignatureDeclaration | undefined;

      const id = `${fileName.replaceAll('/', '-')}_${functionName}`;

      if (map.has(id)) return;

      map.set(id, [fileName, functionName]);

      const startPos = node.getStart(sourceFile);

      const { line } = sourceFile.getLineAndCharacterOfPosition(startPos);

      if (isFunctionDeclaration(node) || isMethodDeclaration(node) || isArrowFunction(node)) {
        functionNode = node;
      } else if (isVariableStatement(node)) {
        const decl = node.declarationList.declarations[0];
        if (isVariableDeclaration(decl) && decl.initializer && isArrowFunction(decl.initializer)) {
          functionNode = decl.initializer;
        }
      }

      let returnType = 'any';
      if (functionNode) {
        // Get return type from signature if available
        const signature = checker.getSignatureFromDeclaration(functionNode);
        if (signature) {
          const retType = checker.getReturnTypeOfSignature(signature);
          returnType = checker.typeToString(retType);
        }
      }

      // Use custom JSX detection which works for both concise and block arrow functions
      const returnsJSX = functionNode ? doesReturnJSX(functionNode) : false;

      const finalReturnType = returnsJSX ? 'JSX.Element (or React component)' : returnType;

      const functionDescription = `'${functionName.replace(
        /([a-z])([A-Z])/g,
        '$1 $2'
      )}' is a function that returns a ${
        returnsJSX ? 'React component' : `value of type "${returnType}"`
      }`;

      const parameters = getFunctionParameters(functionNode, sourceFile, checker);

      const info = {
        id,
        name: functionName,
        functionDescription,
        line,
        filePath: fileName,
        parameters,
        returnType: finalReturnType,
        fullText: node.getText(sourceFile),
        normalizedCode: normalizeKibanaCode(node.getText(sourceFile)),
        returnsJSX,
      };

      functions.push(info);
    }

    forEachChild(node, visit);
  }

  visit(sourceFile);

  return functions;
}

function getFunctionParameters(
  node: SignatureDeclaration | undefined,
  sourceFile: SourceFile,
  checker: TypeChecker
):
  | Array<{
      name: string;
      type: string | undefined;
      optional: boolean;
    }>
  | undefined {
  if (!node || !node.parameters) return undefined;

  return node.parameters.map((param) => {
    const paramName = param.name.getText(sourceFile);
    const paramType = param.type
      ? checker.typeToString(checker.getTypeAtLocation(param.type))
      : undefined;
    const isOptional = !!param.questionToken;

    return {
      name: paramName,
      type: paramType,
      optional: isOptional,
    };
  });
}

function doesReturnJSX(node: Node): boolean {
  let foundJSX = false;

  function check(n: Node, isRootFunction = false) {
    // Check return statements containing JSX
    if (isReturnStatement(n) && n.expression) {
      if (isJSXExpression(n.expression)) {
        foundJSX = true;
        return;
      }
    }

    // Check concise arrow function returning JSX directly
    if (isArrowFunction(n) && isJSXExpression(n.body)) {
      foundJSX = true;
      return;
    }

    // Don't traverse into nested functions (but do traverse the root function)
    if (
      !isRootFunction &&
      (isFunctionDeclaration(n) || isArrowFunction(n) || isMethodDeclaration(n))
    ) {
      return;
    }

    forEachChild(n, (child) => check(child, false));
  }

  check(node, true);

  return foundJSX;
}

function isJSXExpression(node: Node): boolean {
  return (
    isJsxElement(node) ||
    isJsxSelfClosingElement(node) ||
    isJsxFragment(node) ||
    // Handle parenthesized JSX expressions
    (isParenthesizedExpression(node) && isJSXExpression(node.expression))
  );
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

async function queueFunctionForBulkUpload(func: FunctionInfo) {
  bulkQueue.push(func);

  if (bulkQueue.length >= BULK_BATCH_SIZE) {
    await flushBulkQueue();
  }
}

async function flushBulkQueue() {
  if (bulkQueue.length === 0) return;

  const bulkBody = bulkQueue.flatMap((func) => {
    const { id, ...rest } = func;
    return [{ index: { _index: '__AST_INDEX_NAME__', _id: id } }, rest];
  });

  const res = await fetch(`${'__ES_HOST__'}/_bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-ndjson',
      Authorization: `Basic ${'__AUTH__'}`,
    },
    body: bulkBody.map((line) => JSON.stringify(line)).join('\n') + '\n',
  });

  const responseJson = await res.json();

  if (!res.ok) {
    log({
      type: 'error',
      msg: `Failed to bulk upload functions: ${res.status} - ${res.statusText}`,
    });
  } else if (responseJson.errors) {
    log({
      type: 'error',
      msg: `Failed to bulk upload functions, ES errors: ${JSON.stringify(responseJson, null, 2)}`,
    });
  }

  bulkQueue.length = 0; // Clear queue
}

export interface PackageStats {
  id: string;
  name: string;
  filePath: string;
  totalFilesInPackage: number;
  totalSourceFiles: number;
  totalFunctionsInPackage: number;
  skippedFiles: number;
  timeToCompile: number;
  timeToProcess: number;
}

async function uploadStats(stats: PackageStats) {
  const res = await fetch(`${'__ES_HOST__'}/${'__STATS_INDEX_NAME__'}/_doc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-ndjson',
      Authorization: `Basic ${'__AUTH__'}`,
    },
    body: JSON.stringify(stats),
  });

  const responseJson = await res.json();

  if (!res.ok) {
    log({
      type: 'error',
      msg: `Failed to upload stats for ${stats.id}: ${res.status} - ${res.statusText}`,
    });
  } else if (responseJson.errors) {
    log({
      type: 'error',
      msg: `Failed to bulk upload functions, ES errors: ${JSON.stringify(responseJson, null, 2)}`,
    });
  }
}

function log(args: any) {
  if (debug) {
    // eslint-disable-next-line no-console
    console.log(`[Worker]`, args);
  } else {
    parentPort?.postMessage(args);
  }
}
