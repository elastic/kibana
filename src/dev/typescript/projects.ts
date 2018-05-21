import glob from 'glob';
import { resolve } from 'path';

import { REPO_ROOT } from '../constants';
import { Project } from './project';

export const PROJECTS = [
  'tsconfig.json',
  'x-pack/tsconfig.json',
  ...glob.sync('packages/*/tsconfig.json', { cwd: REPO_ROOT }),
].map(path => Project.fromConfig(resolve(REPO_ROOT, path)));
