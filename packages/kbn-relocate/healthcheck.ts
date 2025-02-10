/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import fs from 'fs';
import path, { join } from 'path';
import { getPackages } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';
import { EXCLUDED_FOLDERS, EXCLUDED_FOLDER_NAMES, EXTENSIONS } from './constants';
import { BASE_FOLDER } from './constants';

const findPaths = (content: string): string[] => {
  const regex = /([\.]{1,2}(\/[^\s)\]\['`#"]+)+)/g;
  return content.match(regex) || [];
};

const findUrls = (content: string): string[] => {
  const regex = /http(s)?:\/\/([^\s)\]\['`#"]+)/g;
  return content.match(regex) || [];
};

const checkUrlExists = async (url: string, tries = 3): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'GET' });
    return response.ok;
  } catch (error) {
    return tries > 0 ? checkUrlExists(url, tries - 1) : false;
  }
};

const isModuleReference = (moduleNames: string[], reference: string): boolean => {
  return (
    reference.includes('/packages/') || reference.includes('/plugins/') // ||
    // moduleNames.some((name) => reference.includes(name))
  );
};

const checkIfResourceExists = (baseDir: string, reference: string): boolean => {
  const filePath = join(baseDir, reference);
  const rootReference = join(BASE_FOLDER, reference);
  const fatherReference = join(baseDir, '..', reference);

  return (
    filePath.includes('/target') || // ignore target folders
    filePath.includes('{') || // ignore paths with variables
    filePath.includes('(') || // ignore paths with regexps / vars
    filePath.includes('*') || // assume wildcard patterns exist
    fs.existsSync(filePath) ||
    fs.existsSync(`${filePath}.ts`) ||
    fs.existsSync(`${filePath}.tsx`) ||
    fs.existsSync(`${filePath}.d.ts`) ||
    fs.existsSync(`${filePath}.js`) ||
    fs.existsSync(`${filePath}/index.ts`) ||
    fs.existsSync(`${filePath}/index.js`) ||
    fs.existsSync(rootReference) ||
    fs.existsSync(`${rootReference}.js`) ||
    fs.existsSync(fatherReference)
  );
};

const getAllFiles = (
  dirPath: string,
  arrayOfFiles: fs.Dirent[] = [],
  extensions?: string[]
): fs.Dirent[] => {
  const files = fs.readdirSync(dirPath, { withFileTypes: true });

  files.forEach((file) => {
    const filePath = path.join(dirPath, file.name);
    if (
      !EXCLUDED_FOLDERS.some((folder) => filePath.startsWith(join(BASE_FOLDER, folder))) &&
      !EXCLUDED_FOLDER_NAMES.includes(file.name)
    ) {
      if (fs.statSync(filePath).isDirectory()) {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
      } else {
        if (!extensions || extensions.find((ext) => file.name.endsWith(ext))) {
          arrayOfFiles.push(file);
        }
      }
    }
  });

  return arrayOfFiles;
};

export const findBrokenReferences = async (log: ToolingLog) => {
  const packages = getPackages(REPO_ROOT);
  const moduleNames = packages.map((pkg) => pkg.directory.split('/').pop()!);
  const files = getAllFiles(BASE_FOLDER, [], EXTENSIONS);

  for (const file of files) {
    const fileBrokenReferences = [];
    const filePath = join(file.path, file.name);
    const content = fs.readFileSync(filePath, 'utf-8');
    const references = findPaths(content);

    for (const ref of references) {
      if (isModuleReference(moduleNames, ref) && !checkIfResourceExists(file.path, ref)) {
        fileBrokenReferences.push(ref);
      }
    }

    if (fileBrokenReferences.length > 0) {
      log.info(filePath, fileBrokenReferences);
    }
  }
};

export const findBrokenLinks = async (log: ToolingLog) => {
  const files = getAllFiles(BASE_FOLDER);

  for (const file of files) {
    const fileBrokenLinks = [];
    const filePath = join(file.path, file.name);
    const content = fs.readFileSync(filePath, 'utf-8');
    const references = findUrls(content);

    for (const ref of references) {
      if (
        ref.includes('github.com/elastic/kibana') &&
        ref.includes('blob') &&
        !(await checkUrlExists(ref))
      ) {
        fileBrokenLinks.push(ref);
      }
    }

    if (fileBrokenLinks.length > 0) {
      log.info(filePath, fileBrokenLinks);
    }
  }
};
