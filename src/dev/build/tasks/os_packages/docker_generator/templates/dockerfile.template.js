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

function generator({ artifactTarball, versionTag, license  }) {
  return dedent(`
  #
  # ** THIS IS AN AUTO-GENERATED FILE **
  # 
  FROM centos:7
  EXPOSE 5601
  
  # Add Reporting dependencies.
  RUN yum update -y && yum install -y fontconfig freetype && yum clean all
  
  WORKDIR /usr/share/kibana
  
  # Copy Kibana artifact tarball inside the docker image
  COPY --chown=1000:0 ${ artifactTarball } .
  
  # Set gid to 0 for kibana and make group permission similar to that of user
  # This is needed, for example, for Openshift Open:
  # https://docs.openshift.org/latest/creating_images/guidelines.html
  # and allows Kibana to run with an uid
  RUN tar --strip-components=1 -zxf ${ artifactTarball } && \\
      rm -rf ${artifactTarball} && \\
      ln -s /usr/share/kibana /opt/kibana && \\
      chown -R 1000:0 . && \\
      chmod -R g=u /usr/share/kibana && \\
      find /usr/share/kibana -type d -exec chmod g+s {} \\;
  
  ENV ELASTIC_CONTAINER true
  ENV PATH=/usr/share/kibana/bin:$PATH
  
  # Set some Kibana configuration defaults.
  COPY --chown=1000:0 config/kibana.yml /usr/share/kibana/config/kibana.yml
  
  # Add the launcher/wrapper script. It knows how to interpret environment
  # variables and translate them to Kibana CLI options.
  COPY --chown=1000:0 bin/kibana-docker /usr/local/bin/
  
  # Ensure gid 0 write permissions for Openshift.
  RUN find /usr/share/kibana -gid 0 -and -not -perm /g+w -exec chmod g+w {} \\;
  
  # Provide a non-root user to run the process.
  RUN groupadd --gid 1000 kibana && \\
      useradd --uid 1000 --gid 1000 \\
        --home-dir /usr/share/kibana --no-create-home \\
        kibana
  
  USER 1000
  
  LABEL org.label-schema.schema-version="1.0" \\
    org.label-schema.vendor="Elastic" \\
    org.label-schema.name="kibana" \\
    org.label-schema.version="${ versionTag }" \\
    org.label-schema.url="https://www.elastic.co/products/kibana" \\
    org.label-schema.vcs-url="https://github.com/elastic/kibana" \\
    license="${ license }"
  
  CMD ["/usr/local/bin/kibana-docker"]
  `);
}

export const dockerfileTemplate = {
  name: 'Dockerfile',
  generator,
};
