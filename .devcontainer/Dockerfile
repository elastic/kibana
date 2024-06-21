FROM mcr.microsoft.com/devcontainers/base:focal

ARG NODE_VERSION=20.13.1

RUN apt-get update && apt-get install -y curl git zsh locales docker.io

RUN locale-gen en_US.UTF-8
ENV LANG=en_US.UTF-8 LANGUAGE=en_US:en LC_ALL=en_US.UTF-8

# Install NVM and Node.js
ENV NVM_DIR=/usr/local/nvm
RUN mkdir -p $NVM_DIR && \ 
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash && \
  . "$NVM_DIR/nvm.sh" && \
  nvm install ${NODE_VERSION} && \
  nvm use ${NODE_VERSION} && \
  nvm alias default ${NODE_VERSION}

# Install Oh My Zsh and plugins
RUN if [ ! -d "$HOME/.oh-my-zsh" ]; then \
  sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"; \
  fi && \
  ZSH_CUSTOM=${ZSH_CUSTOM:-~/.oh-my-zsh/custom} && \
  if [ ! -d "$ZSH_CUSTOM/plugins/zsh-autosuggestions" ]; then \
  git clone https://github.com/zsh-users/zsh-autosuggestions $ZSH_CUSTOM/plugins/zsh-autosuggestions; \
  fi && \
  sed -i 's/plugins=(git)/plugins=(git ssh-agent npm docker zsh-autosuggestions)/' ~/.zshrc

# Docker-in-Docker setup
RUN curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh && \
  docker --version

# Expose ports (Note: This is for documentation. Use `docker run -p` to map ports at runtime.)
EXPOSE 9200 5601
