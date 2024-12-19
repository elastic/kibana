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
    const pipeline = source.pipe(
      where(`@timestamp <= NOW() AND @timestamp > NOW() - 24 hours`),
      where('log.level', '==', 'error')
    );
    expect(pipeline.asString()).toEqual(
      'FROM `logs-*`\n\t| WHERE @timestamp <= NOW() AND @timestamp > NOW() - 24 hours\n\t| WHERE log.level == ?'
    );
    expect(pipeline.getBindings()).toEqual(['error']);
  });

  it('appends a WHERE clause with positional parameters', () => {
    const pipeline = source.pipe(where('host.id == ?', 'host'));
    expect(pipeline.asString()).toEqual('FROM `logs-*`\n\t| WHERE host.id == ?');
    expect(pipeline.getBindings()).toEqual(['host']);
  });

  it('appends a WHERE clause with named parameters', () => {
    const params = { hostName: 'host', serviceName: 'service' };
    const pipeline = source.pipe(
      where('host.name = ?hostName AND service.name = ?serviceName', params)
    );
    expect(pipeline.asString()).toEqual(
      'FROM `logs-*`\n\t| WHERE host.name = ?hostName AND service.name = ?serviceName'
    );
    expect(pipeline.getBindings()).toEqual([{ hostName: 'host' }, { serviceName: 'service' }]);
  });

  it('handles WHERE clause with IN operator and positional parameters', () => {
    const hosts = ['host1', 'host2', 'host3'];
    const pipeline = source.pipe(where(`host.name IN (${hosts.map(() => '?').join(',')})`, hosts));
    expect(pipeline.asString()).toEqual('FROM `logs-*`\n\t| WHERE host.name IN (?,?,?)');
    expect(pipeline.getBindings()).toEqual(['host1', 'host2', 'host3']);
  });

  it('handles nested WHERE clauses with OR conditions', () => {
    const pipeline = source.pipe(
      where(() => where('host.name == ?', 'host4').or('host.name', '==', 'host5'))
    );
    expect(pipeline.asString()).toEqual(
      'FROM `logs-*`\n\t| WHERE (host.name == ? OR host.name == ?)'
    );
    expect(pipeline.getBindings()).toEqual(['host4', 'host5']);
  });

  it('handles nested WHERE clauses with AND and OR combinations', () => {
    const hosts = ['host1', 'host2', 'host3'];
    const pipeline = source.pipe(
      where(() => where('host.name == ?', 'host4').or('host.name', '==', 'host5')).and(
        `host.name IN (${hosts.map(() => '?').join(',')})`,
        hosts
      )
    );
    expect(pipeline.asString()).toEqual(
      'FROM `logs-*`\n\t| WHERE (host.name == ? OR host.name == ?) AND host.name IN (?,?,?)'
    );
    expect(pipeline.getBindings()).toEqual(['host4', 'host5', 'host1', 'host2', 'host3']);
  });

  it('handles multiple nested WHERE clauses', () => {
    const pipeline = source.pipe(
      where(() => where('host.name == ?', 'host4').or('host.name', '==', 'host5')).and(
        'service.name == ?',
        'service1'
      )
    );
    expect(pipeline.asString()).toEqual(
      'FROM `logs-*`\n\t| WHERE (host.name == ? OR host.name == ?) AND service.name == ?'
    );
    expect(pipeline.getBindings()).toEqual(['host4', 'host5', 'service1']);
  });

  it('handles empty parameters gracefully', () => {
    const pipeline = source.pipe(where('host.name == ?', ''));
    expect(pipeline.asString()).toEqual('FROM `logs-*`\n\t| WHERE host.name == ?');
    expect(pipeline.getBindings()).toEqual(['']);
  });

  it('handles deeply nested queries', () => {
    const pipeline = source.pipe(
      where(() => where('host.name == ?', 'host1').or('host.name == ?', 'host2')).and(() =>
        where('service.name == ?', 'service1').or('service.name == ?', 'service2')
      )
    );
    expect(pipeline.asString()).toEqual(
      'FROM `logs-*`\n\t| WHERE (host.name == ? OR host.name == ?) AND (service.name == ? OR service.name == ?)'
    );
    expect(pipeline.getBindings()).toEqual(['host1', 'host2', 'service1', 'service2']);
  });

  it('handles WHERE clause with object', () => {
    const pipeline = source.pipe(where({ 'host.name': 'host', 'service.name': 'service' }));
    expect(pipeline.asString()).toEqual(
      'FROM `logs-*`\n\t| WHERE host.name == ? AND service.name == ?'
    );
    expect(pipeline.getBindings()).toEqual(['host', 'service']);
  });

  it('handles WHERE clause with object with  AND and OR combinations', () => {
    const pipeline = source.pipe(
      where({
        'log.level': 'error',
      })
        .and(() => where('host.name == ?', 'host4').or('host.name', '==', 'host5'))
        .and({
          'log.message': 'error message',
        })
    );
    expect(pipeline.asString()).toEqual(
      'FROM `logs-*`\n\t| WHERE log.level == ? AND (host.name == ? OR host.name == ?) AND log.message == ?'
    );
    expect(pipeline.getBindings()).toEqual(['error', 'host4', 'host5', 'error message']);
  });

  it('handles WHERE clause with with many OR groups and nested conditions', () => {
    const pipeline = source.pipe(
      where('host.name == ?', 'host2')
        .and(() =>
          where({ 'log.level': 'warning' })
            .or({ 'log.message': 'debug' })
            .or({ 'log.message': 'info' })
            .or({ 'log.level': 'error' })
        )
        .or(() =>
          where(() => where('host.name == ?', 'host1').or('host.name == ?', 'host2')).and(() =>
            where('service.name == ?', 'service1').or('service.name == ?', 'service2')
          )
        )
    );
    expect(pipeline.asString()).toEqual(
      'FROM `logs-*`\n\t| WHERE host.name == ? AND (log.level == ? OR log.message == ? OR log.message == ? OR log.level == ?) OR ((host.name == ? OR host.name == ?) AND (service.name == ? OR service.name == ?))'
    );
    expect(pipeline.getBindings()).toEqual([
      'host2',
      'warning',
      'debug',
      'info',
      'error',
      'host1',
      'host2',
      'service1',
      'service2',
    ]);
  });
});
