/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FailureScenario } from '../../types';

/**
 * Failure scenarios for Quarkus Super Heroes.
 * These simulate real-world misconfigurations and failures in a microservices application.
 */
export const QUARKUS_SUPER_HEROES_SCENARIOS: FailureScenario[] = [
  // ============ DRAMATIC FAILURES ============
  {
    id: 'heroes-db-disconnect',
    name: 'Heroes Database Disconnect',
    description: `Heroes REST service cannot reach its PostgreSQL database.
All hero lookups fail, breaking the fight functionality as heroes cannot be retrieved.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'rest-heroes',
        variable: 'QUARKUS_DATASOURCE_REACTIVE_URL',
        value: 'postgresql://heroes-db:9999/heroes_database',
        description: 'Point rest-heroes at dead DB port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'rest-heroes',
        variable: 'QUARKUS_DATASOURCE_REACTIVE_URL',
        value: 'postgresql://heroes-db:5432/heroes_database',
        description: 'Restore rest-heroes DB URL',
      },
    ],
  },
  {
    id: 'villains-db-disconnect',
    name: 'Villains Database Disconnect',
    description: `Villains REST service cannot reach its PostgreSQL database.
All villain lookups fail, breaking the fight functionality as villains cannot be retrieved.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'rest-villains',
        variable: 'QUARKUS_DATASOURCE_JDBC_URL',
        value: 'jdbc:postgresql://villains-db:9999/villains_database',
        description: 'Point rest-villains at dead DB port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'rest-villains',
        variable: 'QUARKUS_DATASOURCE_JDBC_URL',
        value: 'jdbc:postgresql://villains-db:5432/villains_database',
        description: 'Restore rest-villains DB URL',
      },
    ],
  },
  {
    id: 'fights-db-disconnect',
    name: 'Fights MongoDB Disconnect',
    description: `Fights REST service cannot reach its MongoDB database.
Fight history cannot be stored or retrieved, breaking the core fight functionality.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'rest-fights',
        variable: 'QUARKUS_MONGODB_HOSTS',
        value: 'fights-db:9999',
        description: 'Point rest-fights at dead MongoDB port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'rest-fights',
        variable: 'QUARKUS_MONGODB_HOSTS',
        value: 'fights-db:27017',
        description: 'Restore rest-fights MongoDB URL',
      },
    ],
  },
  {
    id: 'heroes-service-unreachable',
    name: 'Heroes Service Unreachable',
    description: `Fights service cannot reach the Heroes REST service via Stork discovery.
Fights cannot retrieve random heroes, breaking the main application flow.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'rest-fights',
        variable: 'QUARKUS_STORK_HERO_SERVICE_SERVICE_DISCOVERY_ADDRESS_LIST',
        value: 'rest-heroes:9999',
        description: 'Point rest-fights to wrong heroes service port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'rest-fights',
        variable: 'QUARKUS_STORK_HERO_SERVICE_SERVICE_DISCOVERY_ADDRESS_LIST',
        value: 'rest-heroes:8083',
        description: 'Restore heroes service address',
      },
    ],
  },
  {
    id: 'villains-service-unreachable',
    name: 'Villains Service Unreachable',
    description: `Fights service cannot reach the Villains REST service via Stork discovery.
Fights cannot retrieve random villains, breaking the main application flow.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'rest-fights',
        variable: 'QUARKUS_STORK_VILLAIN_SERVICE_SERVICE_DISCOVERY_ADDRESS_LIST',
        value: 'rest-villains:9999',
        description: 'Point rest-fights to wrong villains service port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'rest-fights',
        variable: 'QUARKUS_STORK_VILLAIN_SERVICE_SERVICE_DISCOVERY_ADDRESS_LIST',
        value: 'rest-villains:8084',
        description: 'Restore villains service address',
      },
    ],
  },
  {
    id: 'kafka-disconnect',
    name: 'Kafka Disconnect',
    description: `Fights service and event statistics cannot reach Kafka.
Fight events cannot be published or consumed, breaking event-driven functionality.`,
    category: 'dramatic',
    steps: [
      {
        type: 'env',
        service: 'rest-fights',
        variable: 'KAFKA_BOOTSTRAP_SERVERS',
        value: 'PLAINTEXT://fights-kafka:9999',
        description: 'Point rest-fights to wrong Kafka port',
      },
      {
        type: 'env',
        service: 'event-statistics',
        variable: 'KAFKA_BOOTSTRAP_SERVERS',
        value: 'PLAINTEXT://fights-kafka:9999',
        description: 'Point event-statistics to wrong Kafka port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'rest-fights',
        variable: 'KAFKA_BOOTSTRAP_SERVERS',
        value: 'PLAINTEXT://fights-kafka:9092',
        description: 'Restore rest-fights Kafka address',
      },
      {
        type: 'env',
        service: 'event-statistics',
        variable: 'KAFKA_BOOTSTRAP_SERVERS',
        value: 'PLAINTEXT://fights-kafka:9092',
        description: 'Restore event-statistics Kafka address',
      },
    ],
  },

  // ============ SUBTLE FAILURES ============
  {
    id: 'narration-service-unavailable',
    name: 'Narration Service Unavailable',
    description: `Fights service cannot reach the narration REST service.
Fight narrations cannot be generated, but core fight functionality still works.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'rest-fights',
        variable: 'QUARKUS_STORK_NARRATION_SERVICE_SERVICE_DISCOVERY_ADDRESS_LIST',
        value: 'rest-narration:9999',
        description: 'Point rest-fights to wrong narration service port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'rest-fights',
        variable: 'QUARKUS_STORK_NARRATION_SERVICE_SERVICE_DISCOVERY_ADDRESS_LIST',
        value: 'rest-narration:8087',
        description: 'Restore narration service address',
      },
    ],
  },
  {
    id: 'locations-service-unavailable',
    name: 'Locations gRPC Service Unavailable',
    description: `Fights service cannot reach the locations gRPC service.
Fight locations cannot be retrieved, but fights can still occur without location data.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'rest-fights',
        variable: 'QUARKUS_GRPC_CLIENTS_LOCATIONS_PORT',
        value: '9999',
        description: 'Point rest-fights to wrong gRPC locations port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'rest-fights',
        variable: 'QUARKUS_GRPC_CLIENTS_LOCATIONS_PORT',
        value: '8089',
        description: 'Restore gRPC locations port',
      },
    ],
  },
  {
    id: 'locations-db-disconnect',
    name: 'Locations Database Disconnect',
    description: `Locations gRPC service cannot reach its MariaDB database.
Location lookups fail, affecting fight location information but not core fights.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'grpc-locations',
        variable: 'QUARKUS_DATASOURCE_JDBC_URL',
        value: 'jdbc:mariadb://locations-db:9999/locations_database',
        description: 'Point grpc-locations at dead MariaDB port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'grpc-locations',
        variable: 'QUARKUS_DATASOURCE_JDBC_URL',
        value: 'jdbc:mariadb://locations-db:3306/locations_database',
        description: 'Restore grpc-locations MariaDB URL',
      },
    ],
  },
  {
    id: 'ui-api-disconnect',
    name: 'UI API Disconnect',
    description: `Super Heroes UI cannot reach the fights REST API.
Users cannot initiate fights, but backend services continue to function normally.`,
    category: 'subtle',
    steps: [
      {
        type: 'env',
        service: 'ui-super-heroes',
        variable: 'API_BASE_URL',
        value: 'http://rest-fights:9999',
        description: 'Point UI to wrong fights API port',
      },
    ],
    recovery: [
      {
        type: 'env',
        service: 'ui-super-heroes',
        variable: 'API_BASE_URL',
        value: 'http://rest-fights:8082',
        description: 'Restore UI fights API URL',
      },
    ],
  },
];
