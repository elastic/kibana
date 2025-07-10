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
      'FROM logs-*\n  | WHERE @timestamp <= NOW() AND @timestamp > NOW() - 24 hours'
    );
  });

  it('appends a WHERE clause with positional parameters', () => {
    const pipeline = source.pipe(where('timestamp.us >= ?', 1704892605838000));
    const queryRequest = pipeline.asRequest();

    expect(queryRequest.query).toEqual('FROM logs-*\n  | WHERE timestamp.us >= ?');
    expect(queryRequest.params).toEqual([1704892605838000]);
    expect(pipeline.asString()).toEqual('FROM logs-*\n  | WHERE timestamp.us >= 1704892605838000');
  });

  it('appends a WHERE clause with named parameters', () => {
    const params = { hostName: 'host', serviceName: 'service' };
    const pipeline = source.pipe(
      where('host.name == ?hostName AND service.name == ?serviceName', params)
    );
    const queryRequest = pipeline.asRequest();

    expect(queryRequest.query).toEqual(
      'FROM logs-*\n  | WHERE host.name == ?hostName AND service.name == ?serviceName'
    );
    expect(queryRequest.params).toEqual([{ hostName: 'host' }, { serviceName: 'service' }]);
    expect(pipeline.asString()).toEqual(
      'FROM logs-*\n  | WHERE host.name == "host" AND service.name == "service"'
    );
  });

  // ast has a problem with positional parameters in IN operator
  it.skip('handles WHERE clause with IN operator and positional parameters', () => {
    const hosts = ['host1', 'host2', 'host3'];
    const pipeline = source.pipe(where(`host.name IN (${hosts.map(() => '?').join(',')})`, hosts));
    const queryRequest = pipeline.asRequest();

    expect(queryRequest.query).toEqual('FROM `logs-*`\n  | WHERE host.name IN (?,?,?)');
    expect(queryRequest.params).toEqual(['host1', 'host2', 'host3']);
    expect(pipeline.asString()).toEqual(
      'FROM logs-*\n  | WHERE host.name IN ("host1","host2","host3")'
    );
  });
});
