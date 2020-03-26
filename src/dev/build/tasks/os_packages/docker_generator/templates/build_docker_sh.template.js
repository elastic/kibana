/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import dedent from 'dedent';

function generator({
  imageTag,
  imageFlavor,
  versionTag,
  dockerOutputDir,
  baseOSImage,
  ubiImageFlavor,
}) {
  return dedent(`
  #!/usr/bin/env bash
  #
  # ** THIS IS AN AUTO-GENERATED FILE **
  #
  set -euo pipefail

  docker pull ${baseOSImage}

  echo "Building: kibana${imageFlavor}${ubiImageFlavor}-docker"; \\
  docker build -t ${imageTag}${imageFlavor}${ubiImageFlavor}:${versionTag} -f Dockerfile . || exit 1;

  docker save ${imageTag}${imageFlavor}${ubiImageFlavor}:${versionTag} | gzip -c > ${dockerOutputDir}

  exit 0
  `);
}

export const buildDockerSHTemplate = {
  name: 'build_docker.sh',
  generator,
};
