import { resolve, relative } from 'path';

// resolve() treats relative paths as relative to process.cwd(),
// so to return a relative path we use relative()
function resolveRelative(path) {
  return relative(process.cwd(), resolve(path));
}

export const KIBANA_EXEC = 'node';
export const KIBANA_EXEC_PATH = resolveRelative('scripts/kibana');
export const KIBANA_ROOT = resolve(__dirname, '../../../../../');
export const KIBANA_FTR_SCRIPT = resolve(
  KIBANA_ROOT,
  'scripts/functional_test_runner'
);
export const PROJECT_ROOT = resolve(__dirname, '../../../../../../');
export const FUNCTIONAL_CONFIG_PATH = resolve(
  KIBANA_ROOT,
  'test/functional/config'
);
export const API_CONFIG_PATH = resolve(
  KIBANA_ROOT,
  'test/api_integration/config'
);
export const OPTIMIZE_BUNDLE_DIR = resolve(KIBANA_ROOT, 'optimize/bundles');
