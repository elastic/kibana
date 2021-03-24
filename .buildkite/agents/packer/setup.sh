#!/usr/bin/env bash

set -euxo pipefail

export DEBIAN_FRONTEND="noninteractive"

AGENT_USER="buildkite-agent"
AGENT_HOME="/var/lib/buildkite-agent"

sh -c 'echo deb https://apt.buildkite.com/buildkite-agent stable main > /etc/apt/sources.list.d/buildkite-agent.list'
apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 32A37959C2FA5C3C99EFBC32A79206696452D198

rm -rf /var/lib/apt/lists/*

apt-get update --yes
apt-get install --yes \
  apt-transport-https \
  ca-certificates \
  curl \
  gnupg-agent \
  software-properties-common \
  buildkite-agent

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
add-apt-repository \
   "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
   $(lsb_release -cs) \
   stable"

curl -sSL https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'

apt-get update --yes

apt-get install --yes \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  git \
  jq \
  rsync \
  openjdk-11-jre-headless \
  unzip \
  build-essential

apt-get -y install xvfb gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 \
      libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 \
      libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 \
      libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 \
      libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils

apt-get install -y google-chrome-stable firefox --no-install-recommends

LATEST_VAULT_RELEASE=$(curl -s https://api.github.com/repos/hashicorp/vault/tags | jq --raw-output .[0].name[1:]) \
  && curl -L https://releases.hashicorp.com/vault/${LATEST_VAULT_RELEASE}/vault_${LATEST_VAULT_RELEASE}_linux_amd64.zip -o vault.zip \
  && unzip vault.zip \
  && rm vault.zip \
  && chmod +x vault \
  && mv vault /usr/local/bin/vault

usermod -a -G docker "$AGENT_USER"

mkdir -p "$AGENT_HOME/.java"
cd "$AGENT_HOME/.java"
curl -O https://download.java.net/java/GA/jdk14.0.2/205943a0976c4ed48cb16f1043c5c647/12/GPL/openjdk-14.0.2_linux-x64_bin.tar.gz
tar -xvf openjdk-14.0.2_linux-x64_bin.tar.gz
mv jdk-14.0.2 openjdk14
chown -R "$AGENT_USER":"$AGENT_USER" .
cd -

cat > /etc/apt/apt.conf.d/10periodic <<'EOF'
APT::Periodic::Enable "0";
EOF

cat >> /etc/security/limits.conf <<'EOF'
*                soft    nofile          100000
*                hard    nofile          100000
EOF

mkdir -p /etc/systemd/system/buildkite-agent.service.d
cat > /etc/systemd/system/buildkite-agent.service.d/10-agent-poweroff.conf <<'EOF'
[Service]
Restart=no
PermissionsStartOnly=true
ExecStopPost=/bin/systemctl poweroff
EOF

cat > /etc/systemd/system/buildkite-agent.service.d/10-disable-tasks-accounting.conf <<'EOF'
[Service]
# Disable tasks accounting
# This fixes the "cgroup: fork rejected by pids controller" error that some CI jobs triggered.
TasksAccounting=no
EOF

cat > /etc/buildkite-agent/buildkite-agent.cfg <<EOF
token="$BUILDKITE_TOKEN"
build-path="/var/lib/buildkite-agent/builds"
hooks-path="/etc/buildkite-agent/hooks"
plugins-path="/etc/buildkite-agent/plugins"
experiment="git-mirrors"
git-mirrors-path="/var/lib/gitmirrors"
git-clone-flags="--dissociate"
git-clone-mirror-flags="-v --bare"
tags-from-gcp=true
tags-from-gcp-labels=true
tags-from-host=true
timestamp-lines=true
debug=true
EOF

gcloud auth configure-docker --quiet

# Setup git mirrors
{
  mkdir -p /var/lib/gitmirrors
  cd /var/lib/gitmirrors
  docker pull gcr.io/elastic-kibana-184716/buildkite/ci/base:0afe7a0463e6a512646aaff775df5d3978dfb87b &
  git clone --mirror https://github.com/elastic/kibana.git https---github-com-elastic-kibana-git &
  git clone --mirror https://github.com/elastic/elasticsearch.git https---github-com-elastic-elasticsearch-git &
  wait

  chown -R "$AGENT_USER:$AGENT_USER" .
  chmod -R 0755 .

  cd -
}

mv /tmp/bk-startup.sh /opt/bk-startup.sh
chown root:root /opt/bk-startup.sh
chmod +x /opt/bk-startup.sh

cat /etc/buildkite-agent/buildkite-agent.cfg
systemctl disable buildkite-agent

apt-get clean
rm -rf /var/lib/apt/lists/*
sync

sleep 3