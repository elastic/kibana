/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAgentIcon } from '@kbn/custom-icons';
import awsIcon from './icons/aws.svg';
import cassandraIcon from './icons/cassandra.svg';
import darkCassandraIcon from './icons/cassandra_dark.svg';
import databaseIcon from './icons/database.svg';
import darkDatabaseIcon from './icons/database_dark.svg';
import defaultIcon from './icons/default.svg';
import documentsIcon from './icons/documents.svg';
import darkDocumentsIcon from './icons/documents_dark.svg';
import elasticsearchIcon from './icons/elasticsearch.svg';
import globeIcon from './icons/globe.svg';
import darkGlobeIcon from './icons/globe_dark.svg';
import graphqlIcon from './icons/graphql.svg';
import grpcIcon from './icons/grpc.svg';
import darkGrpcIcon from './icons/grpc_dark.svg';
import handlebarsIcon from './icons/handlebars.svg';
import darkHandlebarsIcon from './icons/handlebars_dark.svg';
import kafkaIcon from './icons/kafka.svg';
import darkKafkaIcon from './icons/kafka_dark.svg';
import mongodbIcon from './icons/mongodb.svg';
import mysqlIcon from './icons/mysql.svg';
import postgresqlIcon from './icons/postgresql.svg';
import redisIcon from './icons/redis.svg';
import websocketIcon from './icons/websocket.svg';
import darkWebsocketIcon from './icons/websocket_dark.svg';
import dynamodbIcon from './icons/dynamo_db.svg';
import sThreeIcon from './icons/s3.svg';
import snsIcon from './icons/sns.svg';
import sqsIcon from './icons/sqs.svg';
import cosmosDbIcon from './icons/cosmos_db.svg';
import blobStorageIcon from './icons/blob_storage.svg';
import fileShareStorageIcon from './icons/file_share_storage.svg';
import serviceBusIcon from './icons/service_bus.svg';
import storageQueueIcon from './icons/storage_queue.svg';
import tableStorageIcon from './icons/table_storage.svg';
import ldapIcon from './icons/ldap.svg';

const defaultSpanTypeIcons: { [key: string]: string } = {
  cache: databaseIcon,
  db: databaseIcon,
  ext: globeIcon,
  external: globeIcon,
  messaging: documentsIcon,
  resource: globeIcon,
};

const darkDefaultSpanTypeIcons: { [key: string]: string } = {
  ...defaultSpanTypeIcons,
  cache: darkDatabaseIcon,
  db: darkDatabaseIcon,
  ext: darkGlobeIcon,
  external: darkGlobeIcon,
  messaging: darkDocumentsIcon,
  resource: darkGlobeIcon,
};

export const spanTypeIcons: {
  [type: string]: { [subtype: string]: string };
} = {
  aws: {
    servicename: awsIcon,
  },
  cache: { redis: redisIcon },
  db: {
    cassandra: cassandraIcon,
    cosmosdb: cosmosDbIcon,
    dynamodb: dynamodbIcon,
    elasticsearch: elasticsearchIcon,
    mongodb: mongodbIcon,
    mysql: mysqlIcon,
    postgresql: postgresqlIcon,
    redis: redisIcon,
  },
  external: {
    graphql: graphqlIcon,
    grpc: grpcIcon,
    websocket: websocketIcon,
    ldap: ldapIcon,
  },
  messaging: {
    azurequeue: storageQueueIcon,
    azureservicebus: serviceBusIcon,
    jms: getAgentIcon('java'),
    kafka: kafkaIcon,
    sns: snsIcon,
    sqs: sqsIcon,
  },
  storage: {
    azureblob: blobStorageIcon,
    azurefile: fileShareStorageIcon,
    azuretable: tableStorageIcon,
    s3: sThreeIcon,
  },
  template: {
    handlebars: handlebarsIcon,
  },
};

const darkSpanTypeIcons: { [type: string]: { [subtype: string]: string } } = {
  ...spanTypeIcons,
  db: {
    ...spanTypeIcons.db,
    cassandra: darkCassandraIcon,
  },
  external: {
    ...spanTypeIcons.external,
    grpc: darkGrpcIcon,
    websocket: darkWebsocketIcon,
  },
  messaging: {
    ...spanTypeIcons.messaging,
    kafka: darkKafkaIcon,
  },
  template: {
    handlebars: darkHandlebarsIcon,
  },
};

export function getSpanIcon(type?: string, subtype?: string, isDarkMode: boolean = false) {
  if (!type) {
    return defaultIcon;
  }

  const icons = isDarkMode ? darkSpanTypeIcons : spanTypeIcons;
  const defaults = isDarkMode ? darkDefaultSpanTypeIcons : defaultSpanTypeIcons;
  const types = icons[type];

  if (subtype && types && subtype in types) {
    return types[subtype];
  }
  return defaults[type] || defaultIcon;
}
