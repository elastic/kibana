FROM centos:7 

LABEL Kibana QA <kibana-qa@elastic.co>

WORKDIR /usr/share/kibana

RUN mkdir -p /usr/local/nvm && mkdir /usr/local/yarn

# environment variables
ENV YARN_DIR /usr/local/yarn
ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION 10.15.2

# install nvm
# https://github.com/creationix/nvm#install-script
RUN curl --silent -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash 

# install node and npm
RUN source $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default

# add node and npm to path so the commands are available
ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

# confirm install
RUN node -v
RUN npm -v

# install yarn
RUN curl --silent -o- https://yarnpkg.com/install.sh | bash 

# add yarn to path to the command is available
ENV PATH $HOME/.yarn/bin:$HOME/.config/yarn/global/node_modules/.bin:$PATH

RUN yum install -y epel-release && \
 yum install -y jq

 COPY . /usr/share/kibana
 
 # TODO: Test running yarn from `docker build`