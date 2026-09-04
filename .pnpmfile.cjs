// pnpm resolution hooks. Kept minimal — prefer package.json "pnpm.overrides"
// for simple version pins; use this only when a hook is required.

// Packages whose `redux` peer must bind to redux 4, not the root redux 5.
// They are only consumed by the legacy redux-v4 stores (Redux Toolkit v1/v2
// migration compat aliases). Under pnpm's hoisted node_modules a bare `redux`
// peer resolves to the root redux@5, so their types compile against redux 5 and
// clash with the redux 4 stores. Pinning to redux 4 matches yarn's peer-aware
// hoisting. name -> matcher on the resolved version.
const REDUX_V4_PEER_PACKAGES = {
  'redux-thunk': (version) => version.startsWith('2.'),
  'redux-devtools-extension': () => true,
};

function readPackage(pkg) {
  const matches = REDUX_V4_PEER_PACKAGES[pkg.name];
  if (matches && matches(pkg.version) && pkg.peerDependencies?.redux) {
    delete pkg.peerDependencies.redux;
    pkg.dependencies = { ...pkg.dependencies, redux: 'npm:redux@4.2.1' };
  }

  return pkg;
}

module.exports = { hooks: { readPackage } };
