# NOTE: This Dockerfile is ONLY used to run certain tasks in CI. It is not used to run Kibana or as a distributable.
# If you're looking for the Kibana Docker image distributable, please see: src/dev/build/tasks/os_packages/docker_generator/templates/dockerfile.template.ts

ARG NODE_VERSION=14.16.0

FROM node:${NODE_VERSION} AS base

RUN apt-get update && \
    apt-get -y install xvfb gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 \
      libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 \
      libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 \
      libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 \
      libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget openjdk-8-jre && \
    rm -rf /var/lib/apt/lists/*

RUN curl -sSL https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && apt-get update \
  && apt-get install -y rsync jq bsdtar google-chrome-stable \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN LATEST_VAULT_RELEASE=$(curl -s https://api.github.com/repos/hashicorp/vault/tags | jq --raw-output .[0].name[1:]) \
  && curl -L https://releases.hashicorp.com/vault/${LATEST_VAULT_RELEASE}/vault_${LATEST_VAULT_RELEASE}_linux_amd64.zip -o vault.zip \
  && unzip vault.zip \
  && rm vault.zip \
  && chmod +x vault \
  && mv vault /usr/local/bin/vault

# RUN groupadd -r kibana && useradd -r -g kibana kibana && mkdir /home/kibana && chown kibana:kibana /home/kibana

# # COPY ./bash_standard_lib.sh /usr/local/bin/bash_standard_lib.sh
# # RUN chmod +x /usr/local/bin/bash_standard_lib.sh

# RUN mkdir -p /home/kibana/workspace/kibana && chown -R kibana:kibana /home/kibana/workspace
# # RUN mkdir -p /home/kibana/yarn-offline-cache && chown -R kibana:kibana /home/kibana/workspace
# USER kibana
# WORKDIR /home/kibana/workspace/kibana
# COPY package.json yarn.lock preinstall_check.js ./
# RUN yarn config set yarn-offline-mirror "/home/kibana/yarn-offline-cache"
# RUN --mount=type=cache,uid=999,gid=999,target=/home/kibana/yarn-offline-cache ls -alh /home/kibana/yarn-offline-cache; # Need uid/guid of kibana user
# RUN --mount=type=cache,uid=999,gid=999,target=/home/kibana/yarn-offline-cache yarn install
# COPY --chown=kibana:kibana . .
# RUN ls -alh .
# RUN mkdir ~/.npm-global && npm config set prefix '~/.npm-global'
# RUN ls -alh /home/kibana/workspace/kibana
# RUN yarn kbn bootstrap

# ENTRYPOINT [ "yarn" ]

RUN mkdir -p /var/lib/kibana/workspace/kibana
WORKDIR /var/lib/kibana/workspace/kibana
COPY package.json yarn.lock preinstall_check.js ./
RUN yarn config set yarn-offline-mirror "/var/lib/kibana/yarn-offline-cache"
RUN --mount=type=cache,target=/var/lib/kibana/yarn-offline-cache yarn install

# TODO move all of this to a wrapper?

ENV CI=true
ENV HOME=/var/lib/kibana

ENV KIBANA_DIR=/var/lib/kibana/workspace/kibana
ENV XPACK_DIR=/var/lib/kibana/workspace/kibana/x-pack

ENV CACHE_DIR=/var/lib/kibana/.cache
ENV PARENT_DIR=/var/lib/kibana/workspace
ENV WORKSPACE=/var/lib/kibana/workspace

# TODO change to ARG?
ENV KIBANA_PKG_BRANCH=master
ENV KIBANA_BASE_BRANCH=naster

ENV GECKODRIVER_CDNURL="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache"
ENV CHROMEDRIVER_CDNURL="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache"
ENV RE2_DOWNLOAD_MIRROR="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache"
ENV CYPRESS_DOWNLOAD_MIRROR="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/cypress"

ENV NODE_OPTIONS="--max-old-space-size=4096"

ENV FORCE_COLOR=1
ENV TEST_BROWSER_HEADLESS=1

ENV ELASTIC_APM_ENVIRONMENT=ci
ENV ELASTIC_APM_TRANSACTION_SAMPLE_RATE=0.1

ENV ELASTIC_APM_ACTIVE=false
ENV CHECKS_REPORTER_ACTIVE=false

ENV FLEET_PACKAGE_REGISTRY_PORT=6104
ENV TEST_CORS_SERVER_PORT=6105

ENV DETECT_CHROMEDRIVER_VERSION=true
ENV CHROMEDRIVER_FORCE_DOWNLOAD=true

ENV GCS_UPLOAD_PREFIX=asihdauishd98u42589

# TODO
ENV NODE_VERSION=14.16.0

COPY . .

RUN node --version
RUN yarn kbn bootstrap
RUN yarn kbn run build -i @kbn/pm
RUN node scripts/build_plugin_list_docs

ENTRYPOINT [ "yarn" ]
