import glob from 'glob';
import { resolve } from 'path';

import { REPO_ROOT } from '../constants';
import { Project } from './project';

export const PROJECTS = [
  'tsconfig.json',
  'x-pack/tsconfig.json',
  // NOTE: using glob.sync rather than glob-all or globby
  // because it takes less than 10 ms, while the other modules
  // both took closer to 1000ms.
  ...glob.sync('packages/*/tsconfig.json', { cwd: REPO_ROOT }),
].map(path => new Project(resolve(REPO_ROOT, path)));
