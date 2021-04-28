# NOTE: This Dockerfile is ONLY used to run tasks in CI. It is not used to run Kibana or as a distributable.
# If you're looking for the Kibana Docker image distributable, please see: src/dev/build/tasks/os_packages/docker_generator/templates/dockerfile.template.ts

ARG NODE_VERSION=14.16.1

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

RUN groupadd -r kibana && useradd -r -g kibana kibana && mkdir /home/kibana && chown kibana:kibana /home/kibana
RUN mkdir -p /var/lib/kibana/workspace/kibana && chown -R kibana:kibana /var/lib/kibana
WORKDIR /var/lib/kibana/workspace/kibana
COPY --chown=kibana:kibana package.json yarn.lock preinstall_check.js .bazeliskversion ./
RUN npm install -g --force yarn@^"$(node -e "console.log(String(require('./package.json').engines.yarn || '').replace(/^[^\d]+/,''))")" && \
  npm install -g @bazel/bazelisk@"$(cat .bazeliskversion)"
USER kibana
RUN yarn config set yarn-offline-mirror "/var/lib/kibana/yarn-offline-cache"
# RUN --mount=type=cache,target=/var/lib/kibana/yarn-offline-cache yarn install
RUN yarn install

COPY --chown=kibana:kibana . .

ENV BUILD_TS_REFS_DISABLE=true
RUN yarn kbn bootstrap --no-cache

# RUN chown -R kibana:kibana /var/lib/kibana/

USER kibana
ENTRYPOINT ["/var/lib/kibana/workspace/kibana/.buildkite/scripts/entrypoint.sh"]
