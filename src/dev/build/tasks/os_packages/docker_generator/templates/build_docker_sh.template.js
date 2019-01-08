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

export function buildDockerSHTemplate({ httpD, artifactsDir, imageTag, imageFlavor, versionTag, dockerOutput }) {
  return dedent(`
  #!/usr/bin/env bash
  #
  # ** THIS IS AN AUTO-GENERATED FILE **
  # ** PLEASE DO NOT CHANGE IT MANUALLY **
  #
  set -euo pipefail
  
  clean_docker() {
    (docker kill ${ httpD } 2>&1) >/dev/null
    docker rmi ${ imageTag }${ imageFlavor }:${ versionTag }
  }
  
  trap clean_docker EXIT
  
  docker pull centos:7
  
  docker run --rm -d --name=${ httpD } \\
	           --network=host -v ${ artifactsDir }:/mnt \\
	           python:3 bash -c 'cd /mnt && python3 -m http.server' \\
	           timeout 120 bash -c 'until curl -s localhost:8000 > /dev/null; do sleep 1; done'
  
  echo "Building: kibana${ imageFlavor }-docker"; \\
  docker build --network=host -t ${ imageTag }${ imageFlavor }:${ versionTag } -f Dockerfile . || exit 1;

  docker save -o ${ dockerOutput } ${ imageTag }${ imageFlavor }:${ versionTag }
  
  exit 0
  `);
}
