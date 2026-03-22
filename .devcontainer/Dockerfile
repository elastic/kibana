FROM mcr.microsoft.com/devcontainers/typescript-node:22-bullseye

# Install additional tools
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    curl \
    git \
    jq \
    vim \
    && rm -rf /var/lib/apt/lists/*

# Install global npm packages
RUN npm install -g yarn@1.22.22

# Set up workspace
WORKDIR /workspace

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt update \
    && apt install gh -y

# Configure git (will be overridden by user config)
RUN git config --global user.name "AESOP Dev Container" \
    && git config --global user.email "aesop@elastic.local"

USER node
