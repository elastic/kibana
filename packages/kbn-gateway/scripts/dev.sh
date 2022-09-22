#! /bin/bash

VERSION="$1"

echo -e "Starting Elastic Stack ${VERSION}..."

echo "
version: '3'
services:
  elasticsearch:
    image: 'docker.elastic.co/elasticsearch/elasticsearch:${VERSION}'
    container_name: elasticsearch_${VERSION}
    ports:
      - 9205:9200
    environment:
      - ES_JAVA_OPTS=-Xms512m -Xmx512m
      - discovery.type=single-node
      - xpack.security.enabled=false
    ulimits:
      memlock:
        soft: -1
        hard: -1
  kibana_01:
    image: 'docker.elastic.co/kibana/kibana:${VERSION}'
    container_name: kibana_01_${VERSION}
    ports:
      - 5605:5601
    environment:
      - SERVER_PORT=5601
  kibana_02:
    image: 'docker.elastic.co/kibana/kibana:${VERSION}'
    container_name: kibana_02_${VERSION}
    ports:
      - 5606:5602
    environment:
      - SERVER_PORT=5602
" | docker-compose -f - up
