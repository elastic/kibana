import globby from 'globby';

import { REPO_ROOT } from '../constants';
import { Project } from './project';

export const PROJECTS = globby.sync([
  'packages/*/tsconfig.json',
  'tsconfig.json',
  'x-pack/tsconfig.json'
], {
  cwd: REPO_ROOT,
  absolute: true,
}).map(path => Project.fromConfig(path))
