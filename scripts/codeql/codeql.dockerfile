FROM ubuntu:latest

ENV DEBIAN_FRONTEND=noninteractive

ARG USERNAME=codeql
ARG CODEQL_VERSION="v2.19.0"
ENV CODEQL_HOME /usr/local/codeql-home

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    passwd \
    adduser \
    bash \
    curl \
    git \
    unzip \
    nodejs \
    jq

RUN adduser --home ${CODEQL_HOME} ${USERNAME}

RUN curl -Lk "https://github.com/github/codeql-action/releases/download/codeql-bundle-${CODEQL_VERSION}/codeql-bundle-linux64.tar.gz" -o codeql.tar.gz \
    && mkdir -p ${CODEQL_HOME} \
    && tar -xvzf codeql.tar.gz -C ${CODEQL_HOME} \
    && rm codeql.tar.gz

RUN chmod +x ${CODEQL_HOME}/codeql/codeql

RUN chown -R ${USERNAME}:${USERNAME} ${CODEQL_HOME}

USER ${USERNAME}

ENV PATH="${CODEQL_HOME}/codeql:${PATH}"

RUN echo $PATH && codeql --version

WORKDIR /workspace

ENTRYPOINT ["/bin/bash", "-c"]
