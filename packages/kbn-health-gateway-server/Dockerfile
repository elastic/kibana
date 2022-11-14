# syntax=docker/dockerfile:1

# kbn02

FROM kibana:8.5.0
RUN /bin/bash -c 'echo "" >> /usr/share/kibana/config/kibana.yml; \
echo "" >> /usr/share/kibana/config/kibana.yml; \
echo "xpack.encryptedSavedObjects.encryptionKey: 3d4287649b966445620a678767d167b2" >> /usr/share/kibana/config/kibana.yml; \
echo "xpack.reporting.encryptionKey: 704624eebb4f0184c2813f341aca82e8" >> /usr/share/kibana/config/kibana.yml; \
echo "xpack.security.encryptionKey: 56338cf9ebc0b3529a4ec43602d22364" >> /usr/share/kibana/config/kibana.yml;'
