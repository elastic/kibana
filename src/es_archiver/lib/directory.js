import { readdir } from 'fs';

import { fromNode } from 'bluebird';

export async function readDirectory(path) {
  const allNames = await fromNode(cb => readdir(path, cb));
  return allNames.filter(name => !name.startsWith('.'));
}
