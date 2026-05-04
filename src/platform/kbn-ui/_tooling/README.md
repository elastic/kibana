# `_tooling/`

Build-time helpers shared by every `@kbn/ui-*` package under
`src/platform/kbn-ui/`. This directory is **not** a distributable package,
nothing in here ships in a tarball or is consumed at runtime. Scripts are
invoked from each package's `packaging/scripts/build.sh`.

## Contents

- `metadata.js`: writes `metadata.json` (name, version, git SHA, build timestamp, peer dependencies) into a package's `target/` directory.