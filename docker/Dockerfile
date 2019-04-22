# Build command: `docker build -t sqren/backport .`
# Publish: docker push sqren/backport

FROM node:latest

RUN mkdir /app
WORKDIR /app

COPY ./entrypoint.sh /entrypoint.sh

RUN npm install backport -g
ENTRYPOINT ["/entrypoint.sh"]
CMD []
