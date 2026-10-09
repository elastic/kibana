/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DemoConfig, ServiceConfig } from '../../types';

const CONTAINER_REGISTRY = 'quay.io/quarkus-super-heroes';

/**
 * Quarkus Super Heroes configuration
 * https://github.com/quarkusio/quarkus-super-heroes
 */
export const quarkusSuperHeroesConfig: DemoConfig = {
  id: 'quarkus-super-heroes',
  displayName: 'Quarkus Super Heroes',
  namespace: 'quarkus-super-heroes',
  description:
    'Quarkus microservices demo - Heroes vs Villains with Kafka events, MongoDB, PostgreSQL, MariaDB',
  defaultVersion: 'java21-latest',
  availableVersions: ['java21-latest', 'native-latest'],

  frontendService: {
    name: 'ui-super-heroes',
    nodePort: 30082,
  },

  getServices: (version = 'java21-latest'): ServiceConfig[] => [
    // PostgreSQL for Heroes
    {
      name: 'heroes-db',
      image: 'postgres:16',
      port: 5432,
      env: {
        POSTGRES_USER: 'superman',
        POSTGRES_PASSWORD: 'superman',
        POSTGRES_DB: 'heroes_database',
      },
      resources: {
        requests: { memory: '256Mi', cpu: '100m' },
        limits: { memory: '512Mi', cpu: '500m' },
      },
    },

    // PostgreSQL for Villains
    {
      name: 'villains-db',
      image: 'postgres:16',
      port: 5432,
      env: {
        POSTGRES_USER: 'superbad',
        POSTGRES_PASSWORD: 'superbad',
        POSTGRES_DB: 'villains_database',
      },
      resources: {
        requests: { memory: '256Mi', cpu: '100m' },
        limits: { memory: '512Mi', cpu: '500m' },
      },
    },

    // MongoDB for Fights
    {
      name: 'fights-db',
      image: 'mongo:7.0',
      port: 27017,
      env: {
        MONGO_INITDB_DATABASE: 'fights',
        MONGO_INITDB_ROOT_USERNAME: 'superfight',
        MONGO_INITDB_ROOT_PASSWORD: 'superfight',
      },
      resources: {
        requests: { memory: '256Mi', cpu: '100m' },
        limits: { memory: '512Mi', cpu: '500m' },
      },
    },

    // MariaDB for Locations
    {
      name: 'locations-db',
      image: 'mariadb:11.5',
      port: 3306,
      env: {
        MARIADB_USER: 'locations',
        MARIADB_PASSWORD: 'locations',
        MARIADB_DATABASE: 'locations_database',
        MARIADB_ROOT_PASSWORD: 'locations',
        MARIADB_SKIP_TEST_DB: 'yes',
      },
      resources: {
        requests: { memory: '256Mi', cpu: '100m' },
        limits: { memory: '512Mi', cpu: '500m' },
      },
    },

    // Kafka for events
    {
      name: 'fights-kafka',
      image: 'quay.io/strimzi/kafka:0.43.0-kafka-3.8.0',
      port: 9092,
      env: {
        LOG_DIR: '/tmp/logs',
        KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://fights-kafka:9092',
      },
      resources: {
        requests: { memory: '512Mi', cpu: '100m' },
        limits: { memory: '1Gi', cpu: '1' },
      },
    },

    // Apicurio Schema Registry
    {
      name: 'apicurio',
      image: 'quay.io/apicurio/apicurio-registry-mem:2.6.5.Final',
      port: 8086,
      env: {
        REGISTRY_AUTH_ANONYMOUS_READ_ACCESS_ENABLED: 'true',
        QUARKUS_HTTP_PORT: '8086',
      },
      resources: {
        requests: { memory: '128Mi', cpu: '50m' },
        limits: { memory: '512Mi', cpu: '500m' },
      },
    },

    // REST Heroes Service
    {
      name: 'rest-heroes',
      image: `${CONTAINER_REGISTRY}/rest-heroes:${version}`,
      port: 8083,
      env: {
        QUARKUS_DATASOURCE_REACTIVE_URL: 'postgresql://heroes-db:5432/heroes_database',
        QUARKUS_HIBERNATE_ORM_SCHEMA_MANAGEMENT_STRATEGY: 'drop-and-create',
        QUARKUS_DATASOURCE_USERNAME: 'superman',
        QUARKUS_DATASOURCE_PASSWORD: 'superman',
        QUARKUS_HIBERNATE_ORM_SQL_LOAD_SCRIPT: 'no-file',
        QUARKUS_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'http://otel-collector:4317',
        OTEL_SERVICE_NAME: 'rest-heroes',
      },
      resources: {
        requests: { memory: '256Mi', cpu: '250m' },
        limits: { memory: '1Gi', cpu: '1' },
      },
      initContainers: [
        {
          name: 'wait-for-heroes-db',
          image: 'busybox:1.36',
          command: [
            'sh',
            '-c',
            'until nc -z heroes-db 5432; do echo waiting for heroes-db; sleep 2; done',
          ],
        },
      ],
    },

    // REST Villains Service
    {
      name: 'rest-villains',
      image: `${CONTAINER_REGISTRY}/rest-villains:${version}`,
      port: 8084,
      env: {
        QUARKUS_DATASOURCE_JDBC_URL: 'jdbc:postgresql://villains-db:5432/villains_database',
        QUARKUS_HIBERNATE_ORM_SCHEMA_MANAGEMENT_STRATEGY: 'drop-and-create',
        QUARKUS_DATASOURCE_USERNAME: 'superbad',
        QUARKUS_DATASOURCE_PASSWORD: 'superbad',
        QUARKUS_HIBERNATE_ORM_SQL_LOAD_SCRIPT: 'no-file',
        QUARKUS_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'http://otel-collector:4317',
        OTEL_SERVICE_NAME: 'rest-villains',
      },
      resources: {
        requests: { memory: '256Mi', cpu: '250m' },
        limits: { memory: '1Gi', cpu: '1' },
      },
      initContainers: [
        {
          name: 'wait-for-villains-db',
          image: 'busybox:1.36',
          command: [
            'sh',
            '-c',
            'until nc -z villains-db 5432; do echo waiting for villains-db; sleep 2; done',
          ],
        },
      ],
    },

    // REST Narration Service (AI narration)
    {
      name: 'rest-narration',
      image: `${CONTAINER_REGISTRY}/rest-narration:${version}`,
      port: 8087,
      env: {
        QUARKUS_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'http://otel-collector:4317',
        OTEL_SERVICE_NAME: 'rest-narration',
      },
      resources: {
        requests: { memory: '256Mi', cpu: '250m' },
        limits: { memory: '1Gi', cpu: '1' },
      },
    },

    // gRPC Locations Service (Kotlin)
    {
      name: 'grpc-locations',
      image: `${CONTAINER_REGISTRY}/grpc-locations:${version}`,
      port: 8089,
      env: {
        QUARKUS_DATASOURCE_JDBC_URL: 'jdbc:mariadb://locations-db:3306/locations_database',
        QUARKUS_HIBERNATE_ORM_SCHEMA_MANAGEMENT_STRATEGY: 'drop-and-create',
        QUARKUS_DATASOURCE_USERNAME: 'locations',
        QUARKUS_DATASOURCE_PASSWORD: 'locations',
        QUARKUS_HIBERNATE_ORM_SQL_LOAD_SCRIPT: 'no-file',
        QUARKUS_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'http://otel-collector:4317',
        OTEL_SERVICE_NAME: 'grpc-locations',
      },
      resources: {
        requests: { memory: '256Mi', cpu: '250m' },
        limits: { memory: '1Gi', cpu: '1' },
      },
      initContainers: [
        {
          name: 'wait-for-locations-db',
          image: 'busybox:1.36',
          command: [
            'sh',
            '-c',
            'until nc -z locations-db 3306; do echo waiting for locations-db; sleep 2; done',
          ],
        },
      ],
    },

    // REST Fights Service (main orchestrator)
    {
      name: 'rest-fights',
      image: `${CONTAINER_REGISTRY}/rest-fights:${version}`,
      port: 8082,
      env: {
        QUARKUS_MONGODB_HOSTS: 'fights-db:27017',
        KAFKA_BOOTSTRAP_SERVERS: 'PLAINTEXT://fights-kafka:9092',
        QUARKUS_LIQUIBASE_MONGODB_MIGRATE_AT_START: 'false',
        QUARKUS_MONGODB_CREDENTIALS_USERNAME: 'superfight',
        QUARKUS_MONGODB_CREDENTIALS_PASSWORD: 'superfight',
        QUARKUS_MONGODB_CREDENTIALS_AUTH_SOURCE: 'admin',
        QUARKUS_STORK_HERO_SERVICE_SERVICE_DISCOVERY_ADDRESS_LIST: 'rest-heroes:8083',
        QUARKUS_STORK_VILLAIN_SERVICE_SERVICE_DISCOVERY_ADDRESS_LIST: 'rest-villains:8084',
        QUARKUS_STORK_NARRATION_SERVICE_SERVICE_DISCOVERY_ADDRESS_LIST: 'rest-narration:8087',
        QUARKUS_GRPC_CLIENTS_LOCATIONS_HOST: 'grpc-locations',
        QUARKUS_GRPC_CLIENTS_LOCATIONS_PORT: '8089',
        MP_MESSAGING_CONNECTOR_SMALLRYE_KAFKA_APICURIO_REGISTRY_URL:
          'http://apicurio:8086/apis/registry/v2',
        QUARKUS_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'http://otel-collector:4317',
        OTEL_SERVICE_NAME: 'rest-fights',
      },
      resources: {
        requests: { memory: '256Mi', cpu: '250m' },
        limits: { memory: '1Gi', cpu: '1' },
      },
      initContainers: [
        {
          name: 'wait-for-fights-db',
          image: 'busybox:1.36',
          command: [
            'sh',
            '-c',
            'until nc -z fights-db 27017; do echo waiting for fights-db; sleep 2; done',
          ],
        },
      ],
    },

    // Event Statistics Service
    {
      name: 'event-statistics',
      image: `${CONTAINER_REGISTRY}/event-statistics:${version}`,
      port: 8085,
      env: {
        KAFKA_BOOTSTRAP_SERVERS: 'PLAINTEXT://fights-kafka:9092',
        MP_MESSAGING_CONNECTOR_SMALLRYE_KAFKA_APICURIO_REGISTRY_URL:
          'http://apicurio:8086/apis/registry/v2',
        QUARKUS_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'http://otel-collector:4317',
        OTEL_SERVICE_NAME: 'event-statistics',
      },
      resources: {
        requests: { memory: '256Mi', cpu: '250m' },
        limits: { memory: '1Gi', cpu: '1' },
      },
    },

    // UI Super Heroes (frontend)
    {
      name: 'ui-super-heroes',
      image: `${CONTAINER_REGISTRY}/ui-super-heroes:${version}`,
      port: 8080,
      env: {
        API_BASE_URL: 'http://rest-fights:8082',
        QUARKUS_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'http://otel-collector:4317',
        OTEL_SERVICE_NAME: 'ui-super-heroes',
      },
      resources: {
        requests: { memory: '256Mi', cpu: '250m' },
        limits: { memory: '1Gi', cpu: '1' },
      },
    },

    // Load generator - triggers fights periodically
    {
      name: 'load-generator',
      image: 'curlimages/curl:8.5.0',
      command: ['/bin/sh', '-c'],
      args: [
        `while true; do
          curl -s -o /dev/null -X POST http://rest-fights:8082/api/fights/randomfighters -H 'Accept: application/json' || true;
          sleep 2;
          FIGHTERS=$(curl -s http://rest-fights:8082/api/fights/randomfighters -H 'Accept: application/json');
          if [ -n "$FIGHTERS" ]; then
            curl -s -o /dev/null -X POST http://rest-fights:8082/api/fights -H 'Content-Type: application/json' -H 'Accept: application/json' -d "$FIGHTERS" || true;
          fi;
          sleep 3;
        done`,
      ],
      env: {
        OTEL_SERVICE_NAME: 'load-generator',
      },
      resources: {
        requests: { memory: '32Mi', cpu: '25m' },
        limits: { memory: '64Mi', cpu: '100m' },
      },
    },
  ],
};

/**
 * Default environment values for services (used for scenario reset)
 */
export const SERVICE_DEFAULTS: Record<string, Record<string, string>> = {
  'rest-fights': {
    QUARKUS_MONGODB_HOSTS: 'fights-db:27017',
    QUARKUS_STORK_HERO_SERVICE_SERVICE_DISCOVERY_ADDRESS_LIST: 'rest-heroes:8083',
    QUARKUS_STORK_VILLAIN_SERVICE_SERVICE_DISCOVERY_ADDRESS_LIST: 'rest-villains:8084',
    QUARKUS_STORK_NARRATION_SERVICE_SERVICE_DISCOVERY_ADDRESS_LIST: 'rest-narration:8087',
    QUARKUS_GRPC_CLIENTS_LOCATIONS_HOST: 'grpc-locations',
    QUARKUS_GRPC_CLIENTS_LOCATIONS_PORT: '8089',
    KAFKA_BOOTSTRAP_SERVERS: 'PLAINTEXT://fights-kafka:9092',
  },
  'rest-heroes': {
    QUARKUS_DATASOURCE_REACTIVE_URL: 'postgresql://heroes-db:5432/heroes_database',
  },
  'rest-villains': {
    QUARKUS_DATASOURCE_JDBC_URL: 'jdbc:postgresql://villains-db:5432/villains_database',
  },
  'grpc-locations': {
    QUARKUS_DATASOURCE_JDBC_URL: 'jdbc:mariadb://locations-db:3306/locations_database',
  },
  'event-statistics': {
    KAFKA_BOOTSTRAP_SERVERS: 'PLAINTEXT://fights-kafka:9092',
  },
  'ui-super-heroes': {
    API_BASE_URL: 'http://rest-fights:8082',
  },
  'load-generator': {},
};
