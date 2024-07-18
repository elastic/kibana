FROM mcr.microsoft.com/devcontainers/base:focal

ENV LANG=en_US.UTF-8 LANGUAGE=en_US:en LC_ALL=en_US.UTF-8
ENV HOME=/home/vscode
ENV NVM_DIR=${HOME}/nvm
ENV KBN_DIR=/workspaces/kibana
ENV OPENSSL_PATH=${HOME}/openssl
# Only specific versions are FIPS certified.
ENV OPENSSL_VERSION='3.0.8'

RUN apt-get update && apt-get install -y curl git zsh locales docker.io perl make gcc

RUN locale-gen en_US.UTF-8

# Install and setup NVM and Nodejs
COPY .node-version /tmp/
RUN mkdir -p $NVM_DIR && \ 
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash && \
  . "$NVM_DIR/nvm.sh" && \
  NODE_VERSION=$(cat /tmp/.node-version) && \
  nvm install ${NODE_VERSION} && \
  nvm use ${NODE_VERSION} && \
  nvm alias default ${NODE_VERSION} && \
  npm install -g yarn && \
  echo "source $NVM_DIR/nvm.sh" >> ${HOME}/.bashrc && \
  echo "source $NVM_DIR/nvm.sh" >> ${HOME}/.zshrc  && \
  chown -R 1000:1000 "${HOME}/.npm"

# Install Oh My Zsh and plugins
RUN if [ ! -d "$HOME/.oh-my-zsh" ]; then \
  sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"; \
  fi && \
  ZSH_CUSTOM=${ZSH_CUSTOM:-~/.oh-my-zsh/custom} && \
  if [ ! -d "$ZSH_CUSTOM/plugins/zsh-autosuggestions" ]; then \
  git clone https://github.com/zsh-users/zsh-autosuggestions $ZSH_CUSTOM/plugins/zsh-autosuggestions; \
  fi && \
  sed -i 's/plugins=(git)/plugins=(git ssh-agent npm docker zsh-autosuggestions)/' /home/vscode/.zshrc

# Docker-in-Docker setup
RUN usermod -aG docker vscode

# FIPS setup
# https://github.com/openssl/openssl/blob/openssl-3.0/README-FIPS.md
# https://www.openssl.org/docs/man3.0/man7/fips_module.html
WORKDIR ${HOME}

RUN set -e ; \
  mkdir -p "${OPENSSL_PATH}"; \
  curl --retry 8 -S -L -O "https://www.openssl.org/source/openssl-${OPENSSL_VERSION}.tar.gz" ; \
  curl --retry 8 -S -L -O "https://www.openssl.org/source/openssl-${OPENSSL_VERSION}.tar.gz.sha256" ; \
  echo "$(cat openssl-${OPENSSL_VERSION}.tar.gz.sha256) openssl-${OPENSSL_VERSION}.tar.gz" | sha256sum -c ; \
  tar -zxf "openssl-${OPENSSL_VERSION}.tar.gz" ; \
  rm -rf openssl-${OPENSSL_VERSION}.tar* ; \
  cd "${OPENSSL_PATH}-${OPENSSL_VERSION}" ; \
  ./Configure --prefix="${OPENSSL_PATH}" --openssldir="${OPENSSL_PATH}/ssl" --libdir="${OPENSSL_PATH}/lib" enable-fips; \
  make -j $(nproc) > /dev/null ; \
  make install > /dev/null ; \
  rm -rf  "${OPENSSL_PATH}-${OPENSSL_VERSION}" ; \
  chown -R 1000:0 "${OPENSSL_PATH}";

# Enable FIPS for Kibana only. In the future we can override OS wide with ENV OPENSSL_CONF
ENV NODE_OPTIONS="--enable-fips --openssl-config=${KBN_DIR}/.devcontainer/config/nodejs.cnf"
ENV OPENSSL_MODULES=${OPENSSL_PATH}/lib/ossl-modules
ENV XPACK_SECURITY_EXPERIMENTAL_FIPSMODE_ENABLED=true
WORKDIR ${KBN_DIR}

# RUN /usr/bin/echo -e '\n--enable-fips' >> ./config/node.options
# RUN /usr/bin/echo '--openssl-config=${KBN_DIR}/config/nodejs.cnf' >> ./config/node.options
# COPY --chown=1000:0 src/dev/build/tasks/os_packages/docker_generator/resources/fips/openssl/nodejs.cnf "${KBN_DIR}/config/nodejs.cnf"

# This is for documentation. Ports are exposed via devcontainer.json
EXPOSE 9200 5601
