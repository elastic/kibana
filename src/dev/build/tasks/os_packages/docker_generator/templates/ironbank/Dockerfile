################################################################################
# Build stage 0
# Extract Kibana and make various file manipulations.
################################################################################
ARG BASE_REGISTRY=registry1.dso.mil
ARG BASE_IMAGE=redhat/ubi/ubi8
ARG BASE_TAG=8.5

FROM ${BASE_REGISTRY}/${BASE_IMAGE}:${BASE_TAG} as prep_files

RUN yum update --setopt=tsflags=nodocs -y && \
      yum install -y tar gzip && \
      yum clean all

RUN mkdir /usr/share/kibana
WORKDIR /usr/share/kibana
COPY --chown=1000:0 {{artifactTarball}} .
RUN tar --strip-components=1 -zxf {{artifactTarball}}

# Ensure that group permissions are the same as user permissions.
# This will help when relying on GID-0 to run Kibana, rather than UID-1000.
# OpenShift does this, for example.
# REF: https://docs.openshift.org/latest/creating_images/guidelines.html
RUN chmod -R g=u /usr/share/kibana


################################################################################
# Build stage 1
# Copy prepared files from the previous stage and complete the image.
################################################################################
FROM ${BASE_REGISTRY}/${BASE_IMAGE}:${BASE_TAG}
EXPOSE 5601

RUN yum update --setopt=tsflags=nodocs -y && \
      yum install -y fontconfig freetype shadow-utils nss && \
      yum clean all

COPY LICENSE /licenses/elastic-kibana

# Add a dumb init process
COPY tini /bin/tini
RUN chmod +x /bin/tini

# Noto Fonts
RUN mkdir /usr/share/fonts/local
COPY NotoSansCJK-Regular.ttc /usr/share/fonts/local/NotoSansCJK-Regular.ttc
RUN fc-cache -v

# Bring in Kibana from the initial stage.
COPY --from=prep_files --chown=1000:0 /usr/share/kibana /usr/share/kibana
WORKDIR /usr/share/kibana
RUN ln -s /usr/share/kibana /opt/kibana

{{! Please notify @elastic/kibana-security if you want to remove or change this environment variable. }}
ENV ELASTIC_CONTAINER true
ENV PATH=/usr/share/kibana/bin:$PATH

# Set some Kibana configuration defaults.
COPY --chown=1000:0 config/kibana.yml /usr/share/kibana/config/kibana.yml

# Add the launcher/wrapper script. It knows how to interpret environment
# variables and translate them to Kibana CLI options.
COPY --chmod=755 bin/kibana-docker /usr/local/bin/

# Remove the suid bit everywhere to mitigate "Stack Clash"
RUN find / -xdev -perm -4000 -exec chmod u-s {} +

# Provide a non-root user to run the process.
RUN groupadd --gid 1000 kibana && \
    useradd --uid 1000 --gid 1000 -G 0 \
      --home-dir /usr/share/kibana --no-create-home \
      kibana

USER kibana

ENTRYPOINT ["/bin/tini", "--"]

CMD ["/usr/local/bin/kibana-docker"]

HEALTHCHECK --interval=10s --timeout=5s --start-period=1m --retries=5 CMD curl -I -f --max-time 5 http://localhost:5601 || exit 1
