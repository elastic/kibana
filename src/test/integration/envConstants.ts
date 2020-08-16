import { resolve } from 'path';

// paths
export const INTEGRATION_TEST_DIR_PATH = resolve('./src/test/integration');

export const INTEGRATION_TEST_DATA_PATH = resolve(
  './src/test/integration/mock-environment'
);

export const HOMEDIR_PATH = resolve(
  './src/test/integration/mock-environment/homedir'
);

export const REMOTE_ORIGIN_REPO_PATH = resolve(
  './src/test/integration/mock-environment/github.com/backport-org/backport-demo/.git'
);

export const REMOTE_FORK_REPO_PATH = resolve(
  './src/test/integration/mock-environment/github.com/sqren/backport-demo/.git'
);
