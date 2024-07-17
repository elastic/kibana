FROM mcr.microsoft.com/devcontainers/base:focal

RUN apt-get update && apt-get install -y curl git zsh locales docker.io

RUN locale-gen en_US.UTF-8
ENV LANG=en_US.UTF-8 LANGUAGE=en_US:en LC_ALL=en_US.UTF-8

# Install and setup NVM and Nodejs
COPY .node-version /tmp/
ENV NVM_DIR=/usr/local/nvm
RUN mkdir -p $NVM_DIR && \ 
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash && \
  . "$NVM_DIR/nvm.sh" && \
  NODE_VERSION=$(cat /tmp/.node-version) && \
  nvm install ${NODE_VERSION} && \
  nvm use ${NODE_VERSION} && \
  nvm alias default ${NODE_VERSION} && \
  npm install -g yarn && \
  echo "source $NVM_DIR/nvm.sh" >> /home/vscode/.bashrc && \
  echo "source $NVM_DIR/nvm.sh" >> /home/vscode/.zshrc 

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

# This is for documentation. Ports are exposed via devcontainer.json
EXPOSE 9200 5601
