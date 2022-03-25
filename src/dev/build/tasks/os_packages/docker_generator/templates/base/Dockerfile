################################################################################
# This Dockerfile was generated from the template at:
#   src/dev/build/tasks/os_packages/docker_generator/templates/Dockerfile
#
# Beginning of multi stage Dockerfile
################################################################################

################################################################################
# Build stage 0 `builder`:
# Extract Kibana artifact
################################################################################
FROM {{{baseOSImage}}} AS builder

{{#ubi}}
RUN {{packageManager}} install -y findutils tar gzip
{{/ubi}}
{{#ubuntu}}
RUN {{packageManager}} update && DEBIAN_FRONTEND=noninteractive {{packageManager}} install -y curl
{{/ubuntu}}

{{#usePublicArtifact}}
RUN cd /tmp && \
  curl --retry 8 -s -L \
    --output kibana.tar.gz \
     https://{{publicArtifactSubdomain}}.elastic.co/downloads/kibana/{{artifactPrefix}}-$(arch).tar.gz && \
  cd -
{{/usePublicArtifact}}

{{^usePublicArtifact}}
COPY {{artifactTarball}} /tmp/kibana.tar.gz
{{/usePublicArtifact}}

RUN mkdir /usr/share/kibana
WORKDIR /usr/share/kibana
RUN tar --strip-components=1 -zxf /tmp/kibana.tar.gz
# Ensure that group permissions are the same as user permissions.
# This will help when relying on GID-0 to run Kibana, rather than UID-1000.
# OpenShift does this, for example.
# REF: https://docs.openshift.org/latest/creating_images/guidelines.html
RUN chmod -R g=u /usr/share/kibana

{{#cloud}}
COPY {{filebeatTarball}} /tmp/filebeat.tar.gz
COPY {{metricbeatTarball}} /tmp/metricbeat.tar.gz

RUN mkdir -p /opt/filebeat /opt/metricbeat && \
  tar xf /tmp/filebeat.tar.gz -C /opt/filebeat --strip-components=1 && \
  tar xf /tmp/metricbeat.tar.gz -C /opt/metricbeat --strip-components=1
{{/cloud}}

################################################################################
# Build stage 1 (the actual Kibana image):
#
# Copy kibana from stage 0
# Add entrypoint
################################################################################
FROM {{{baseOSImage}}}
EXPOSE 5601

{{#ubi}}
RUN for iter in {1..10}; do \
      {{packageManager}} update --setopt=tsflags=nodocs -y && \
      {{packageManager}} install --setopt=tsflags=nodocs -y \
        fontconfig freetype shadow-utils nss findutils && \
      {{packageManager}} clean all && exit_code=0 && break || exit_code=$? && echo "{{packageManager}} error: retry $iter in 10s" && \
      sleep 10; \
    done; \
    (exit $exit_code)
{{/ubi}}
{{#ubuntu}}
RUN for iter in {1..10}; do \
      export DEBIAN_FRONTEND=noninteractive && \
      {{packageManager}} update  && \
      {{packageManager}} upgrade -y  && \
      {{packageManager}} install -y --no-install-recommends \
       fontconfig fonts-liberation libnss3 libfontconfig1 ca-certificates curl && \
      {{packageManager}} clean && \
      rm -rf /var/lib/apt/lists/* && exit_code=0 && break || exit_code=$? && echo "{{packageManager}} error: retry $iter in 10s" && \
      sleep 10; \
    done; \
    (exit $exit_code)
{{/ubuntu}}

# Add an init process, check the checksum to make sure it's a match
RUN set -e ; \
    TINI_BIN="" ; \
    case "$(arch)" in \
        aarch64) \
            TINI_BIN='tini-arm64' ; \
            ;; \
        x86_64) \
            TINI_BIN='tini-amd64' ; \
            ;; \
        *) echo >&2 "Unsupported architecture $(arch)" ; exit 1 ;; \
    esac ; \
  TINI_VERSION='v0.19.0' ; \
  curl --retry 8 -S -L -O "https://github.com/krallin/tini/releases/download/${TINI_VERSION}/${TINI_BIN}" ; \
  curl --retry 8 -S -L -O "https://github.com/krallin/tini/releases/download/${TINI_VERSION}/${TINI_BIN}.sha256sum" ; \
  sha256sum -c "${TINI_BIN}.sha256sum" ; \
  rm "${TINI_BIN}.sha256sum" ; \
  mv "${TINI_BIN}" /bin/tini ; \
  chmod +x /bin/tini

RUN mkdir /usr/share/fonts/local
RUN curl -L -o /usr/share/fonts/local/NotoSansCJK-Regular.ttc https://github.com/googlefonts/noto-cjk/raw/NotoSansV2.001/NotoSansCJK-Regular.ttc
RUN echo "5dcd1c336cc9344cb77c03a0cd8982ca8a7dc97d620fd6c9c434e02dcb1ceeb3  /usr/share/fonts/local/NotoSansCJK-Regular.ttc" | sha256sum -c -
RUN fc-cache -v

# Bring in Kibana from the initial stage.
COPY --from=builder --chown=1000:0 /usr/share/kibana /usr/share/kibana
{{#cloud}}
COPY --from=builder --chown=0:0 /opt /opt
{{/cloud}}
WORKDIR /usr/share/kibana
RUN ln -s /usr/share/kibana /opt/kibana

{{! Please notify @elastic/kibana-security if you want to remove or change this environment variable. }}
ENV ELASTIC_CONTAINER true
ENV PATH=/usr/share/kibana/bin:$PATH

# Set some Kibana configuration defaults.
COPY --chown=1000:0 config/kibana.yml /usr/share/kibana/config/kibana.yml

# Add the launcher/wrapper script. It knows how to interpret environment
# variables and translate them to Kibana CLI options.
COPY bin/kibana-docker /usr/local/bin/

# Ensure gid 0 write permissions for OpenShift.
RUN chmod g+ws /usr/share/kibana && \
    find /usr/share/kibana -gid 0 -and -not -perm /g+w -exec chmod g+w {} \;

# Remove the suid bit everywhere to mitigate "Stack Clash"
RUN find / -xdev -perm -4000 -exec chmod u-s {} +

# Provide a non-root user to run the process.
RUN groupadd --gid 1000 kibana && \
    useradd --uid 1000 --gid 1000 -G 0 \
      --home-dir /usr/share/kibana --no-create-home \
      kibana

LABEL org.label-schema.build-date="{{dockerBuildDate}}" \
  org.label-schema.license="{{license}}" \
  org.label-schema.name="Kibana" \
  org.label-schema.schema-version="1.0" \
  org.label-schema.url="https://www.elastic.co/products/kibana" \
  org.label-schema.usage="https://www.elastic.co/guide/en/kibana/reference/index.html" \
  org.label-schema.vcs-ref="{{revision}}" \
  org.label-schema.vcs-url="https://github.com/elastic/kibana" \
  org.label-schema.vendor="Elastic" \
  org.label-schema.version="{{version}}" \
  org.opencontainers.image.created="{{dockerBuildDate}}" \
  org.opencontainers.image.documentation="https://www.elastic.co/guide/en/kibana/reference/index.html" \
  org.opencontainers.image.licenses="{{license}}" \
  org.opencontainers.image.revision="{{revision}}" \
  org.opencontainers.image.source="https://github.com/elastic/kibana" \
  org.opencontainers.image.title="Kibana" \
  org.opencontainers.image.url="https://www.elastic.co/products/kibana" \
  org.opencontainers.image.vendor="Elastic" \
  org.opencontainers.image.version="{{version}}"

{{#ubi}}
LABEL name="Kibana" \
  maintainer="infra@elastic.co" \
  vendor="Elastic" \
  version="{{version}}" \
  release="1" \
  summary="Kibana" \
  description="Your window into the Elastic Stack."

RUN mkdir /licenses && \
    cp LICENSE.txt /licenses/LICENSE
{{/ubi}}

ENTRYPOINT ["/bin/tini", "--"]

{{#cloud}}
CMD ["/app/kibana.sh"]
# Generate a stub command that will be overwritten at runtime
RUN mkdir /app && \
    echo -e '#!/bin/bash\nexec /usr/local/bin/kibana-docker' > /app/kibana.sh && \
    chmod 0555 /app/kibana.sh
{{/cloud}}

{{^cloud}}
CMD ["/usr/local/bin/kibana-docker"]
{{/cloud}}


USER kibana
