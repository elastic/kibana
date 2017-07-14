import { readdir } from 'fs';
import { dirname } from 'path';

import glob from 'glob';
import { uniq } from 'lodash';
import { fromNode } from 'bluebird';

export async function readDirectory(path) {
  const allNames = await fromNode(cb => readdir(path, cb));
  return allNames.filter(name => !name.startsWith('.'));
}

// get the archives from a path. archives don't have to be direct children
// so this looks for any `.json` or `.gz` file and assumes that it's parent
// directory is an "archive"
export async function findArchiveNames(path) {
  const dataFiles = await fromNode(cb => glob('**/*.{gz,json}', { cwd: path }, cb));
  return uniq(dataFiles.map(dataFile => dirname(dataFile)));
}
