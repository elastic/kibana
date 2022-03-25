/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dedent from 'dedent';

import { TemplateContext } from '../template_context';

function generator({
  imageTag,
  imageFlavor,
  dockerPush,
  dockerTagQualifier,
  dockerCrossCompile,
  version,
  dockerTargetFilename,
  baseOSImage,
  architecture,
}: TemplateContext) {
  const dockerTargetName = `${imageTag}${imageFlavor}:${version}${
    dockerTagQualifier ? '-' + dockerTagQualifier : ''
  }`;
  const dockerArchitecture = architecture === 'aarch64' ? 'linux/arm64' : 'linux/amd64';
  const dockerBuild = dockerCrossCompile
    ? `docker build -t ${imageTag}${imageFlavor}:${version} -f Dockerfile . || exit 1;`
    : `docker buildx build --platform ${dockerArchitecture} -t ${dockerTargetName} -f Dockerfile . || exit 1;`;
  return dedent(`
  #!/usr/bin/env bash
  #
  # ** THIS IS AN AUTO-GENERATED FILE **
  #
  set -euo pipefail

  retry_docker_pull() {
    image=$1
    attempt=0
    max_retries=5

    while true
    do
      attempt=$((attempt+1))

      if [ $attempt -gt $max_retries ]
      then
        echo "Docker pull retries exceeded, aborting."
        exit 1
      fi

      if docker pull "$image"
      then
        echo "Docker pull successful."
        break
      else
        echo "Docker pull unsuccessful, attempt '$attempt'."
      fi

    done
  }

  retry_docker_pull ${baseOSImage}

  echo "Building: kibana${imageFlavor}-docker"; \\
  ${dockerBuild}

  docker save ${dockerTargetName} | gzip -c > ${dockerTargetFilename}

  ${dockerPush} && docker image push ${dockerTargetName}
  exit 0
  `);
}

export const buildDockerSHTemplate = {
  name: 'build_docker.sh',
  generator,
};
