# Path B: inject patched Node 26.8.1 into a serverless image

Experiment-only recipe. Do not promote via `elastic/serverless-gitops`.

## Preconditions

- Kibana checkout is `experiment/heap-profile-label-otel` with the pin at `26.8.1` (`.node-version`, `.nvmrc`, `package.json` `engines.node`).
- **Build-host Node must be `v26.8.1`.** `src/dev/build/tasks/verify_env_task.ts` compares `process.version` to `v` + `engines.node` and exits otherwise. The Darwin sanity binary from `/Users/rudolf/dev/node-v26-test` can be that host Node after it is built; a stock `v26.8.1` also works for the host.
- **Image Node must be linux-x64** (and linux-arm64 if `--docker-cross-compile`). The Darwin `out/Release/node` cannot go in the image.
- The linux patched binary must report:
  - `./node --version` → `v26.8.1`
  - `./node -e "console.log(typeof require('v8').withHeapProfileLabels)"` → `function`

## Shasums (no static file in this repo)

`src/dev/build/tasks/nodejs/node_shasums.ts` fetches

`https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/<variantPath>dist/v26.8.1/SHASUMS256.txt`

at build time. There is no hardcoded list to regenerate.

Checked 2026-09-01:

- default (`dist/v26.8.1/SHASUMS256.txt`): present (proxy 301 → GCS). Official linux-x64 line:
  `b2b76660fa4ded4e0b2a41ee3c0c651cd52ea8170ead91ebac1e147ac3d55643  node-v26.8.1-linux-x64.tar.gz`
- `node-pointer-compression/dist/v26.8.1/SHASUMS256.txt`: **404**
- `node-glibc-217/dist/v26.8.1/SHASUMS256.txt`: **404**

`--serverless` always downloads the `pointer-compression` variant (`src/dev/build/tasks/nodejs/node_download_info.ts`). That download will fail until `elastic/kibana-custom-nodejs-builds` publishes 26.8.1 pointer-compression artifacts.

Workaround for this experiment: do **not** rely on Kibana's DownloadNodeBuilds for the inject step. Plant extract trees yourself (official default tarball is enough for both `default` and `pointer-compression` extract dirs), overwrite `bin/node`, then `--skip-initialize` so download/verify never run.

## Recipe

Set `SHA12` to `$(git -C /Users/rudolf/dev/kibana rev-parse --short=12 HEAD)` when you run this.

### 1. Download + extract official linux Node (skip if extract dirs already exist)

`--serverless --skip-serverless` selects serverless linux platforms and skips Docker. It still runs initialize (VerifyEnv + Clean + download + extract). Clean **deletes `.node_binaries`** when node download is enabled.

Because pointer-compression 404s, use a manual extract instead of `node scripts/build --serverless --skip-serverless`:

```bash
cd /Users/rudolf/dev/kibana
# host node must already be v26.8.1
node --version

VERSION=26.8.1
TARBALL="node-v${VERSION}-linux-x64.tar.gz"
URL="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/dist/v${VERSION}/${TARBALL}"

for variant in default pointer-compression; do
  DEST=".node_binaries/${VERSION}/${variant}/linux-x64"
  mkdir -p "${DEST}/download" "${DEST}/extract"
  curl -fsSL -o "${DEST}/download/${TARBALL}" "${URL}"
  tar -xzf "${DEST}/download/${TARBALL}" --strip-components=1 -C "${DEST}/extract"
done

# Repeat for linux-arm64 if you will pass --docker-cross-compile:
# TARBALL=node-v26.8.1-linux-arm64.tar.gz
# dest dirs: .../linux-arm64/{download,extract}
```

If pointer-compression artifacts are later published, the original initialize-only command is:

```bash
node scripts/build --serverless --skip-serverless \
  --skip-generic-folders --skip-platform-folders --skip-archives \
  --skip-cdn-assets --skip-docker-contexts --skip-os-packages
```

### 2. Overwrite extracted binaries with the linux patched Node

```bash
PATCHED=/path/to/linux-x64/node   # must print v26.8.1
chmod +x "$PATCHED"
"$PATCHED" --version
"$PATCHED" -e "console.log(typeof require('v8').withHeapProfileLabels)"

cp "$PATCHED" .node_binaries/26.8.1/default/linux-x64/extract/bin/node
# also replace pointer-compression so KBN_ENABLE_POINTER_COMPRESSION cannot fall back to stock Node
cp "$PATCHED" .node_binaries/26.8.1/pointer-compression/linux-x64/extract/bin/node
```

Do the same under `linux-arm64` if building a multi-arch image.

### 3. Build the serverless image without re-downloading Node

`--skip-initialize` skips VerifyEnv, Clean, DownloadNodeBuilds, ExtractNodeBuilds. That is required: a second initialize would wipe `.node_binaries` and restore official Node.

```bash
cd /Users/rudolf/dev/kibana
SHA12="$(git rev-parse --short=12 HEAD)"

node scripts/build --serverless --skip-initialize \
  --docker-cross-compile \
  --docker-namespace=kibana-ci \
  --docker-tag="heaplabels-${SHA12}"
```

`--docker-cross-compile` needs a linux-arm64 patched (or at least planted) `bin/node` as well. If you only have linux-x64, drop `--docker-cross-compile` and build amd64 only.

CI's `.buildkite/scripts/steps/artifacts/docker_image.sh` also passes `--release` via `BUILD_ARGS`. Add `--release` here if you need a release-shaped artifact.

Do **not** pass `--skip-node-download` as a substitute for `--skip-initialize`. VerifyExistingNodeBuilds still fetches variant SHASUMS (pointer-compression 404).

### 4. Pin for serverless QA (later; do not push from this step)

Image name written by the docker generator:

`docker.elastic.co/kibana-ci/kibana-serverless:heaplabels-<sha12>`

Project override (same shape as `.buildkite/scripts/steps/serverless/deploy.sh`):

```json
"overrides": {
  "kibana": {
    "docker_image": "docker.elastic.co/kibana-ci/kibana-serverless:heaplabels-<sha12>"
  }
}
```

Pushing to `docker.elastic.co/kibana-ci/` needs CI registry credentials.

## What not to do

- Do not drop a Darwin `out/Release/node` into `.node_binaries/.../linux-x64/`.
- Do not omit `--skip-initialize` on the image build (Clean deletes the planted Node).
- Do not write `qa-ds-1` in `elastic/serverless-gitops` for this experiment.
