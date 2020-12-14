FROM alpine:3.6

RUN apk add --no-cache \
    git \
    libxslt \
    curl \
    python \
    libxml2-utils \
    perl

RUN addgroup kibana && \
    adduser -D -G kibana -s /bin/bash -h /home/kibana kibana

USER kibana
RUN git clone --depth 1 https://github.com/elastic/docs.git /home/kibana/docs_builder

WORKDIR /home/kibana/docs_builder
CMD git pull origin master && ./build_docs.pl --doc /home/kibana/ascii_docs/index.asciidoc --out /home/kibana/html_docs --chunk=1
