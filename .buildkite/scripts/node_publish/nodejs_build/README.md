## Build multi-platform images (~10-15 minutes)

```bash
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
DOCKER_BUILDKIT=1 docker buildx build --progress=plain --push \
  --platform linux/amd64,linux/arm64 \
  --build-arg UID=1000 --build-arg GID=1000 \
  --tag azasypkin/nodejs-custom:18.15.0 .
docker pull --platform linux/amd64 azasypkin/nodejs-custom:18.15.0
docker pull --platform linux/arm64 azasypkin/nodejs-custom:18.15.0
```

## Build Node.js (x64 - ~20 minutes, arm64 - ~4 hours)

```bash
curl --create-dirs --output-dir ./workdir/src -fsSLO --compressed \
  https://nodejs.org/download/release/v18.15.0/node-v18.15.0.tar.xz
tar -xf ./workdir/src/node-v18.15.0.tar.xz -C ./workdir/src
docker run --rm -it --platform linux/amd64 \
  -v ./workdir:/home/node/workdir \
  azasypkin/nodejs-custom:18.15.0 \
  https://unofficial-builds.nodejs.org/download/release/ \
  v18.15.0
  
docker run --rm -it --platform linux/arm64 \
  -v ./workdir:/home/node/workdir \
  azasypkin/nodejs-custom:18.15.0 \
  https://unofficial-builds.nodejs.org/download/release/ \
  v18.15.0
```

## Build re2

```bash
docker run --rm -it --platform linux/amd64 --entrypoint /home/node/re2_entrypoint.sh \
  -v ./workdir:/home/node/workdir \
  -v ./re2-entrypoint.sh:/home/node/re2_entrypoint.sh \
  azasypkin/nodejs-custom:18.15.0 \
  1.17.7 \
  18.15.0 \
  https://github.com/azasypkin/kibana/releases/download/nodej-custom
docker run --rm -it --platform linux/arm64 --entrypoint /home/node/re2_entrypoint.sh \
  -v ./workdir:/home/node/workdir \
  -v ./re2-entrypoint.sh:/home/node/re2_entrypoint.sh \
  azasypkin/nodejs-custom:18.15.0 \
  1.17.7 \
  18.15.0 \
  https://github.com/azasypkin/kibana/releases/download/nodej-custom
```