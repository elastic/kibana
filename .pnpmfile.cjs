// pnpm resolution hooks. Kept minimal — prefer package.json "pnpm.overrides"
// for simple version pins; use this only when a hook is required.

const ALL = () => true;

const REWRITE_RULES = {
  // Packages whose `redux` peer must bind to redux 4, not the root redux 5.
  // They are only consumed by the legacy redux-v4 stores (Redux Toolkit v1/v2
  // migration compat aliases). Under pnpm's hoisted node_modules a bare `redux`
  // peer resolves to the root redux@5, so their types compile against redux 5 and
  // clash with the redux 4 stores. Pinning to redux 4 matches yarn's peer-aware
  // hoisting. name -> matcher on the resolved version.
  'redux-thunk': [
    {
      name: 'replace redux peer dependency with redux 4',
      matchVersion: (version) => version.startsWith('2.'),
      rewrite: (pkg) => {
        delete pkg.peerDependencies.redux;
        pkg.dependencies = { ...pkg.dependencies, redux: 'npm:redux@4.2.1' };
      },
    },
  ],
  'redux-devtools-extension': [
    {
      name: 'replace redux peer dependency with redux 4',
      matchVersion: ALL,
      rewrite: (pkg) => {
        delete pkg.peerDependencies.redux;
        pkg.dependencies = { ...pkg.dependencies, redux: 'npm:redux@4.2.1' };
      },
    },
  ],
};

function readPackage(pkg) {
  const logger = getLoggerForPackage(pkg);
  const rewrites = REWRITE_RULES[pkg.name];
  if (rewrites) {
    for (const rewriteRule of rewrites) {
      if (rewriteRule.matchVersion(pkg.version)) {
        logger.info(`rewrite rule: ${rewriteRule.name}`);
        rewriteRule.rewrite(pkg, logger);
      }
    }
  }

  return pkg;
}

function getLoggerForPackage(pkg) {
  return {
    info: (message) => {
      console.info(`[${pkg.name}@${pkg.version}] ${message}`);
    },
    warn: (message) => {
      console.warn(`[${pkg.name}@${pkg.version}] ${message}`);
    },
  };
}

module.exports = { hooks: { readPackage } };
