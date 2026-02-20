/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const APMSpanFixture = {
  fields: {
    'span.name': ['custom_operation'],
    'host.name.text': ['docker-integrations-6cf69b8966-mnccd'],
    'service.node.name': ['docker-integrations-6cf69b8966-mnccd'],
    'service.node.name.text': ['docker-integrations-6cf69b8966-mnccd'],
    'transaction.id': ['1660300000007173'],
    'trace.id': ['16603000000000000000000000007174'],
    'span.duration.us': [100000],
    'agent.name.text': ['nodejs'],
    'event.success_count': [1],
    'processor.event': ['span'],
    'span.name.text': ['custom_operation'],
    'agent.name': ['nodejs'],
    'host.name': ['docker-integrations-6cf69b8966-mnccd'],
    'processor.name.text': ['transaction'],
    'event.outcome': ['success'],
    'service.environment': ['Synthtrace: logs_traces_hosts'],
    'service.name': ['frontend'],
    'processor.name': ['transaction'],
    'span.id': ['1660300000007178'],
    'span.subtype': ['unknown'],
    'observer.version_major': [9],
    'data_stream.type': ['traces'],
    'span.type': ['custom'],
    tags: ['_geoip_database_unavailable_GeoLite2-City.mmdb'],
    'timestamp.us': [1754986754648000],
    '@timestamp': ['2025-08-12T08:19:14.648Z'],
    'observer.type': ['synthtrace'],
    'observer.version': ['9.1.0-preview-1747764883'],
    'service.name.text': ['frontend'],
    'data_stream.dataset': ['apm'],
    'parent.id': ['1660300000007173'],
    'span.destination.service.resource': ['elasticsearch'],
  },
} as const;

export default APMSpanFixture;
