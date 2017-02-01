import _ from 'lodash';
export default function fitsFixture() {
  return _.map([
    { _source: { '@timestamp': 0, ssl: true, ip: '192.168.0.1', extension: 'php', 'machine.os': 'Linux', bytes: 10, request: 'foo' } },
    { _source: { '@timestamp': 1, ssl: true, ip: '192.168.0.1', extension: 'php', 'machine.os': 'Linux', bytes: 20, request: 'bar' } },
    { _source: { '@timestamp': 2, ssl: true, ip: '192.168.0.1', extension: 'php', 'machine.os': 'Linux', bytes: 30, request: 'bar' } },
    { _source: { '@timestamp': 3, ssl: true, ip: '192.168.0.1', extension: 'php', 'machine.os': 'Linux', bytes: 30, request: 'baz' } },
    { _source: { '@timestamp': 4, ssl: true, ip: '192.168.0.1', extension: 'php', 'machine.os': 'Linux', bytes: 30, request: 'baz' } },
    { _source: { '@timestamp': 5, ssl: true, ip: '192.168.0.1', extension: 'php', 'machine.os': 'Linux', bytes: 30, request: 'baz' } },
    { _source: { '@timestamp': 6, ssl: true, ip: '192.168.0.1', extension: 'php', 'machine.os': 'Linux', bytes: 40.141592, request: 'bat' } },
    { _source: { '@timestamp': 7, ssl: true, ip: '192.168.0.1', extension: 'php', 'machine.os': 'Linux', bytes: 40.141592, request: 'bat' } },
    { _source: { '@timestamp': 8, ssl: true, ip: '192.168.0.1', extension: 'php', 'machine.os': 'Linux', bytes: 40.141592, request: 'bat' } },
    { _source: { '@timestamp': 9, ssl: true, ip: '192.168.0.1', extension: 'php', 'machine.os': 'Linux', bytes: 40.141592, request: 'bat' } },
  ], function (p, i) {
    return _.merge({}, p, {
      _score: 1,
      _id: 1000 + i,
      _type: 'test',
      _index: 'test-index'
    });
  });
};
