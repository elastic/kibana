FROM centos:7

ARG GROUP_ID=1000
ARG USER_ID=1000

RUN groupadd --force --gid $GROUP_ID node
RUN adduser --force --gid $GROUP_ID --uid $USER_ID node

RUN ulimit -n 1024 \
    && yum install -y epel-release \
    && yum install -y centos-release-scl-rh \
    && yum upgrade -y \
    && yum install -y \
         git \
         curl \
         make \
         python2 \
         python3 \
         ccache \
         xz-utils \
         devtoolset-9 \
         glibc-devel

COPY --chown=node:node entrypoint.sh /home/node/entrypoint.sh

USER node

VOLUME /home/node/workdir

ENTRYPOINT [ "/home/node/entrypoint.sh" ]
