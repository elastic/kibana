ARG BASE_IMAGE
FROM ${BASE_IMAGE}
COPY ./* /var/lib/example_plugins
RUN find /var/lib/example_plugins/ -type f -name '*.zip' | xargs -I % /usr/share/kibana/bin/kibana-plugin install 'file://%'
