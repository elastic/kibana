/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const path = require('node:path');
const fs = require('node:fs');
const yaml = require('js-yaml');
const cloneDeep = require('lodash/cloneDeep');
const { ToolingLog } = require('@kbn/tooling-log');
const { REPO_ROOT } = require('@kbn/repo-info');

function isRefNode(node) {
  return typeof node === 'object' && node !== null && '$ref' in node;
}

function parseRef(ref) {
  if (ref.includes('#')) {
    const [filePath, pointer] = ref.split('#');
    return { path: filePath, pointer };
  }
  return { path: ref, pointer: '' };
}

function toAbsolutePath(maybeAbsolutePath, baseDirPath) {
  if (path.isAbsolute(maybeAbsolutePath)) {
    return maybeAbsolutePath;
  }
  return path.join(baseDirPath, maybeAbsolutePath);
}

function extractByJsonPointer(document, pointer) {
  if (!pointer.startsWith('/')) {
    throw new Error('JSON pointer must start with a leading slash');
  }

  if (typeof document !== 'object' || document === null || Array.isArray(document)) {
    throw new Error('document must be an object');
  }

  const segments = pointer.slice(1).split('/');
  let target = document;

  for (const segment of segments) {
    if (typeof target !== 'object' || target === null || Array.isArray(target)) {
      throw new Error(
        `JSON Pointer ${pointer} resolution failure. Expected segment to be a plain object`
      );
    }
    target = target[segment];
  }

  return target;
}

function extractObjectByJsonPointer(document, pointer) {
  const maybeObject = extractByJsonPointer(document, pointer);
  if (typeof maybeObject !== 'object' || maybeObject === null || Array.isArray(maybeObject)) {
    throw new Error(`JSON Pointer resolution failure. Expected ${pointer} to be a plain object`);
  }
  return maybeObject;
}

async function readDocument(documentPath) {
  const extension = path.extname(documentPath);
  const fileContent = await fs.promises.readFile(documentPath, { encoding: 'utf8' });

  switch (extension) {
    case '.yaml':
    case '.yml':
      return yaml.load(fileContent);
    case '.json':
      return JSON.parse(fileContent);
    default:
      throw new Error(`${extension} files are not supported`);
  }
}

function generateComponentName(filePath, pointer) {
  const fileName = path.basename(filePath, path.extname(filePath));
  const baseName = fileName.replace(/[^a-zA-Z0-9]/g, '_');

  if (pointer.startsWith('/components/schemas/')) {
    const schemaName = pointer.split('/').pop();
    return schemaName || baseName;
  }

  return baseName;
}

function ensureUniqueComponentName(components, baseName) {
  let name = baseName;
  let counter = 1;
  while (components[name]) {
    name = `${baseName}_${counter}`;
    counter++;
  }
  return name;
}

function traverseDocument(node, visitor, visited = new Set()) {
  if (visited.has(node)) {
    return;
  }

  if (typeof node !== 'object' || node === null) {
    return;
  }

  visited.add(node);

  if (isRefNode(node)) {
    visitor(node);
    return;
  }

  if (Array.isArray(node)) {
    node.forEach((item) => traverseDocument(item, visitor, visited));
    return;
  }

  Object.values(node).forEach((value) => {
    if (typeof value === 'object' && value !== null) {
      traverseDocument(value, visitor, visited);
    }
  });
}

async function resolveExternalReferences(
  relativeFilePath,
  { log = new ToolingLog({ level: 'info', writeTo: process.stdout }) } = {}
) {
  const absPath = path.resolve(REPO_ROOT, relativeFilePath);
  const baseDir = path.dirname(absPath);

  log.info(`Loading OAS document from ${absPath}`);
  let oasDoc;
  try {
    oasDoc = yaml.load(fs.readFileSync(absPath, 'utf8'));
  } catch (error) {
    log.error(`Failed to load YAML file: ${error.message}`);
    throw error;
  }

  if (!oasDoc.components) {
    oasDoc.components = {};
  }
  if (!oasDoc.components.schemas) {
    oasDoc.components.schemas = {};
  }

  const components = oasDoc.components.schemas;
  const visitedFiles = new Map();

  async function resolveRefRecursive(refNode, refPath, pointer, baseDir) {
    const refAbsolutePath = toAbsolutePath(refPath, baseDir);

    if (!fs.existsSync(refAbsolutePath)) {
      log.warning(`Referenced file does not exist: ${refAbsolutePath}`);
      return;
    }

    const baseComponentName = generateComponentName(refAbsolutePath, pointer);
    const componentName = ensureUniqueComponentName(components, baseComponentName);

    if (components[componentName]) {
      refNode.$ref = `#/components/schemas/${componentName}`;
      log.debug(`Using existing component: ${componentName}`);
      return;
    }

    log.debug(`Resolving external reference: ${refPath}#${pointer}`);

    let refDocument;
    if (visitedFiles.has(refAbsolutePath)) {
      const cached = visitedFiles.get(refAbsolutePath);
      refDocument = cached;
    } else {
      refDocument = await readDocument(refAbsolutePath);
      visitedFiles.set(refAbsolutePath, refDocument);
    }

    let schemaContent;
    if (pointer === '' || pointer === '/') {
      schemaContent = refDocument;
    } else if (pointer.startsWith('/components/schemas/')) {
      schemaContent = extractObjectByJsonPointer(refDocument, pointer);
    } else {
      schemaContent = extractObjectByJsonPointer(refDocument, pointer);
    }

    const clonedSchema = cloneDeep(schemaContent);
    components[componentName] = clonedSchema;
    log.debug(`Added component: ${componentName}`);

    const refBaseDir = path.dirname(refAbsolutePath);
    const nestedRefs = [];
    traverseDocument(clonedSchema, (nestedRefNode) => {
      const { path: nestedRefPath, pointer: nestedPointer } = parseRef(nestedRefNode.$ref);
      if (nestedRefPath && nestedRefPath.trim() !== '' && !nestedRefPath.startsWith('#')) {
        nestedRefs.push({
          refNode: nestedRefNode,
          refPath: nestedRefPath,
          pointer: nestedPointer,
        });
      }
    });

    for (const nestedRef of nestedRefs) {
      await resolveRefRecursive(
        nestedRef.refNode,
        nestedRef.refPath,
        nestedRef.pointer,
        refBaseDir
      );
    }

    refNode.$ref = `#/components/schemas/${componentName}`;
    log.debug(`Replaced external ref with: ${refNode.$ref}`);
  }

  log.info('Scanning for external file references...');

  const refsToResolve = [];
  traverseDocument(oasDoc, (refNode) => {
    const { path: refPath, pointer } = parseRef(refNode.$ref);
    if (refPath && refPath.trim() !== '' && !refPath.startsWith('#')) {
      refsToResolve.push({ refNode, refPath, pointer });
    }
  });

  log.info(`Found ${refsToResolve.length} external file references`);

  for (const { refNode, refPath, pointer } of refsToResolve) {
    try {
      await resolveRefRecursive(refNode, refPath, pointer, baseDir);
    } catch (error) {
      log.warning(`Failed to resolve external reference ${refPath}#${pointer}: ${error.message}`);
    }
  }

  log.info(`Writing resolved document to ${absPath}`);
  fs.writeFileSync(absPath, yaml.dump(oasDoc, { noRefs: true, lineWidth: -1 }), 'utf8');
  log.info('External references resolved successfully');
}

module.exports = { resolveExternalReferences };
