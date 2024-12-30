/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { where } from './where';
import { from } from './from';

describe('where', () => {
  const source = from('logs-*');

  it('appends a basic WHERE clause', () => {
    const pipeline = source.pipe(where(`@timestamp <= NOW() AND @timestamp > NOW() - 24 hours`));

    expect(pipeline.asString()).toEqual(
      'FROM `logs-*`\n\t| WHERE @timestamp <= NOW() AND @timestamp > NOW() - 24 hours'
    );
  });

  it('appends a WHERE clause with positional parameters', () => {
    const pipeline = source.pipe(where('timestamp.us >= ?', 1704892605838000));
    const queryRequest = pipeline.asRequest();

    expect(queryRequest.query).toEqual('FROM `logs-*`\n\t| WHERE timestamp.us >= ?');
    expect(queryRequest.params).toEqual([1704892605838000]);
    expect(pipeline.asString()).toEqual(
      'FROM `logs-*`\n\t| WHERE timestamp.us >= 1704892605838000'
    );
  });

  it('handles WHERE clause with object', () => {
    const pipeline = source.pipe(where({ 'host.name': 'host', 'service.name': 'service' }));
    const queryRequest = pipeline.asRequest();

    expect(queryRequest.query).toEqual(
      'FROM `logs-*`\n\t| WHERE `host.name` == ? AND `service.name` == ?'
    );
    expect(queryRequest.params).toEqual(['host', 'service']);
    expect(pipeline.asString()).toEqual(
      'FROM `logs-*`\n\t| WHERE `host.name` == "host" AND `service.name` == "service"'
    );
  });

  it('appends a WHERE clause with named parameters', () => {
    const params = { hostName: 'host', serviceName: 'service' };
    const pipeline = source.pipe(
      where('host.name == ?hostName AND service.name == ?serviceName', params)
    );
    const queryRequest = pipeline.asRequest();

    expect(queryRequest.query).toEqual(
      'FROM `logs-*`\n\t| WHERE host.name == ?hostName AND service.name == ?serviceName'
    );
    expect(queryRequest.params).toEqual([{ hostName: 'host' }, { serviceName: 'service' }]);
    expect(pipeline.asString()).toEqual(
      'FROM `logs-*`\n\t| WHERE host.name == "host" AND service.name == "service"'
    );
  });

  it('handles WHERE clause with IN operator and positional parameters', () => {
    const hosts = ['host1', 'host2', 'host3'];
    const pipeline = source.pipe(where(`host.name IN (${hosts.map(() => '?').join(',')})`, hosts));
    const queryRequest = pipeline.asRequest();

    expect(queryRequest.query).toEqual('FROM `logs-*`\n\t| WHERE host.name IN (?,?,?)');
    expect(queryRequest.params).toEqual(['host1', 'host2', 'host3']);
    expect(pipeline.asString()).toEqual(
      'FROM `logs-*`\n\t| WHERE host.name IN ("host1","host2","host3")'
    );
  });

  it('handles WHERE with nested OR conditions', () => {
    const pipeline = source.pipe(
      where(() => where('host.name == ?', 'host4').or('host.name == ?', 'host5')).and(
        'service.name == ?',
        'service1'
      )
    );
    const queryRequest = pipeline.asRequest();

    expect(queryRequest.query).toEqual(
      'FROM `logs-*`\n\t| WHERE (host.name == ? OR host.name == ?) AND service.name == ?'
    );
    expect(queryRequest.params).toEqual(['host4', 'host5', 'service1']);
    expect(pipeline.asString()).toEqual(
      'FROM `logs-*`\n\t| WHERE (host.name == "host4" OR host.name == "host5") AND service.name == "service1"'
    );
  });

  it('handles WHERE with multiple nested clauses', () => {
    const pipeline = source.pipe(
      where(() => where('host.name == ?', 'host1').or('host.name == ?', 'host2')).and(() =>
        where('service.name == ?', 'service1').or('service.name == ?', 'service2')
      )
    );
    const queryRequest = pipeline.asRequest();

    expect(queryRequest.query).toEqual(
      'FROM `logs-*`\n\t| WHERE (host.name == ? OR host.name == ?) AND (service.name == ? OR service.name == ?)'
    );
    expect(queryRequest.params).toEqual(['host1', 'host2', 'service1', 'service2']);
    expect(pipeline.asString()).toEqual(
      'FROM `logs-*`\n\t| WHERE (host.name == "host1" OR host.name == "host2") AND (service.name == "service1" OR service.name == "service2")'
    );
  });
});
