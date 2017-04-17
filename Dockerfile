FROM node:0.12.7

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/package.json
RUN npm install

ADD . /usr/src/app

RUN \
    apt-get update \
 && apt-get install -y zip --no-install-recommends \
 && npm run build \
 && find -maxdepth 1 -not -name 'build' -not -name "." -exec rm -rf {} \; \
 && mv build/kibana/* . \
 && rm -rf build \
 && apt-get remove -y zip \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/* /tmp/* /root/.babel.json /root/.npm /var/cache/*

EXPOSE 5601

CMD ./bin/kibana
