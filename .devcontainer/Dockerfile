FROM mcr.microsoft.com/devcontainers/base:ubuntu-22.04

ENV LANG=en_US.UTF-8 LANGUAGE=en_US:en LC_ALL=en_US.UTF-8
ENV HOME=/home/vscode
ENV NVM_DIR=${HOME}/nvm
ENV NVM_VERSION=v0.39.1
ENV OPENSSL_PATH=${HOME}/openssl
# Only specific versions are FIPS certified.
ENV OPENSSL_VERSION='3.0.8'

RUN apt-get update && apt-get install -y curl git zsh locales docker.io perl make gcc xvfb

RUN locale-gen en_US.UTF-8

# Oh My Zsh setup
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
  ./Configure --prefix="${OPENSSL_PATH}" --openssldir="${OPENSSL_PATH}/ssl" --libdir="${OPENSSL_PATH}/lib" shared -Wl,-rpath,${OPENSSL_PATH}/lib enable-fips; \
  make -j $(nproc) > /dev/null ; \
  make install > /dev/null ; \
  rm -rf  "${OPENSSL_PATH}-${OPENSSL_VERSION}" ; \
  chown -R 1000:1000 "${OPENSSL_PATH}";

WORKDIR ${KBN_DIR}

# Node and NVM setup
COPY .node-version /tmp/

USER vscode

RUN mkdir -p $NVM_DIR && \
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh | bash && \
  . "$NVM_DIR/nvm.sh" && \
  NODE_VERSION=$(cat /tmp/.node-version) && \
  nvm install ${NODE_VERSION} && \
  nvm use ${NODE_VERSION} && \
  nvm alias default ${NODE_VERSION} && \
  npm install -g yarn && \
  echo "source $NVM_DIR/nvm.sh" >> ${HOME}/.bashrc && \
  echo "source $NVM_DIR/nvm.sh" >> ${HOME}/.zshrc  && \
  chown -R 1000:1000 "${HOME}/.npm"

USER root

# Reload the env everytime a new shell is opened incase the .env file changed.
RUN echo "source $KBN_DIR/.devcontainer/scripts/env.sh" >> ${HOME}/.bashrc && \
  echo "source $KBN_DIR/.devcontainer/scripts/env.sh" >> ${HOME}/.zshrc

# This is for documentation. Ports are exposed via devcontainer.json
EXPOSE 9200 5601 9229 9230 9231
