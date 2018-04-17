import { resolve, relative } from 'path';
import { platform as getPlatform } from 'os';

// resolve() treats relative paths as relative to process.cwd(),
// so to return a relative path we use relative()
function resolveRelative(path) {
  return relative(process.cwd(), resolve(path));
}

function useBat(bin) {
  return getPlatform().startsWith('win') ? `${bin}.bat` : bin;
}

export const KIBANA_EXEC = 'node';
export const KIBANA_EXEC_PATH = resolveRelative('scripts/kibana');
export const KIBANA_ROOT = resolve(__dirname, '../../../../../');
export const KIBANA_FTR_SCRIPT = resolve(KIBANA_ROOT, 'scripts/functional_test_runner');
export const PROJECT_ROOT = resolve(__dirname, '../../../../../../');
export const FTR_CONFIG_PATH = resolve(KIBANA_ROOT, 'test/functional/config');
export const MULTIPLE_CONFIG_PATH = resolve(KIBANA_ROOT, 'test/multiple_config');
export const OPTIMIZE_BUNDLE_DIR = resolve(KIBANA_ROOT, 'optimize/bundles');
export const ES_REPO_ROOT = resolve(PROJECT_ROOT, './elasticsearch');
export const ES_ARCHIVE_PATTERN = resolve(ES_REPO_ROOT, 'distribution/archives/tar/build/distributions/elasticsearch-*.tar.gz');
export const ES_GRADLE_WRAPPER_BIN = resolve(ES_REPO_ROOT, useBat('gradlew'));

export const RELATIVE_ES_BIN = resolveRelative(useBat('bin/elasticsearch'));
