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
  artifactTarball,
  versionTag,
  license,
  usePublicArtifact,
  baseOSImage,
  ubiImageFlavor,
}) {
  const copyArtifactTarballInsideDockerOptFolder = () => {
    if (usePublicArtifact) {
      return `RUN cd /opt && curl --retry 8 -s -L -O https://artifacts.elastic.co/downloads/kibana/${artifactTarball} && cd -`;
    }

    return `COPY ${artifactTarball} /opt`;
  };

  const packageManager = () => {
    if (ubiImageFlavor) {
      return 'microdnf';
    }

    return 'yum';
  };

  return dedent(`
  #
  # ** THIS IS AN AUTO-GENERATED FILE **
  #

  ################################################################################
  # Build stage 0
  # Extract Kibana and make various file manipulations.
  ################################################################################
  FROM ${baseOSImage} AS prep_files
  # Add tar and gzip
  RUN ${packageManager()} update -y && ${packageManager()} install -y tar gzip && ${packageManager()} clean all
  ${copyArtifactTarballInsideDockerOptFolder()}
  RUN mkdir /usr/share/kibana
  WORKDIR /usr/share/kibana
  RUN tar --strip-components=1 -zxf /opt/${artifactTarball}
  # Ensure that group permissions are the same as user permissions.
  # This will help when relying on GID-0 to run Kibana, rather than UID-1000.
  # OpenShift does this, for example.
  # REF: https://docs.openshift.org/latest/creating_images/guidelines.html
  RUN chmod -R g=u /usr/share/kibana
  RUN find /usr/share/kibana -type d -exec chmod g+s {} \\;

  ################################################################################
  # Build stage 1
  # Copy prepared files from the previous stage and complete the image.
  ################################################################################
  FROM ${baseOSImage}
  EXPOSE 5601

  # Add Reporting dependencies.
  RUN ${packageManager()} update -y && ${packageManager()} install -y fontconfig freetype shadow-utils && ${packageManager()} clean all

  # Add an init process, check the checksum to make sure it's a match
  RUN curl -L -o /usr/local/bin/dumb-init https://github.com/Yelp/dumb-init/releases/download/v1.2.2/dumb-init_1.2.2_amd64
  RUN echo "37f2c1f0372a45554f1b89924fbb134fc24c3756efaedf11e07f599494e0eff9  /usr/local/bin/dumb-init" | sha256sum -c -
  RUN chmod +x /usr/local/bin/dumb-init


  # Bring in Kibana from the initial stage.
  COPY --from=prep_files --chown=1000:0 /usr/share/kibana /usr/share/kibana
  WORKDIR /usr/share/kibana
  RUN ln -s /usr/share/kibana /opt/kibana

  ENV ELASTIC_CONTAINER true
  ENV PATH=/usr/share/kibana/bin:$PATH

  # Set some Kibana configuration defaults.
  COPY --chown=1000:0 config/kibana.yml /usr/share/kibana/config/kibana.yml

  # Add the launcher/wrapper script. It knows how to interpret environment
  # variables and translate them to Kibana CLI options.
  COPY --chown=1000:0 bin/kibana-docker /usr/local/bin/

  # Ensure gid 0 write permissions for OpenShift.
  RUN chmod g+ws /usr/share/kibana && \\
      find /usr/share/kibana -gid 0 -and -not -perm /g+w -exec chmod g+w {} \\;

  # Provide a non-root user to run the process.
  RUN groupadd --gid 1000 kibana && \\
      useradd --uid 1000 --gid 1000 \\
        --home-dir /usr/share/kibana --no-create-home \\
        kibana
  USER kibana

  LABEL org.label-schema.schema-version="1.0" \\
    org.label-schema.vendor="Elastic" \\
    org.label-schema.name="kibana" \\
    org.label-schema.version="${versionTag}" \\
    org.label-schema.url="https://www.elastic.co/products/kibana" \\
    org.label-schema.vcs-url="https://github.com/elastic/kibana" \\
    org.label-schema.license="${license}" \\
    license="${license}"

  ENTRYPOINT ["/usr/local/bin/dumb-init", "--"]

  CMD ["/usr/local/bin/kibana-docker"]
  `);
}

export const dockerfileTemplate = {
  name: 'Dockerfile',
  generator,
};
