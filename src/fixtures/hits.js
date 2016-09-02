export default function fitsFixture() {
  return [
    { '@timestamp': 0, ssl: true, ip: '192.168.0.1', extension: 'php', 'machine.os': 'Linux', bytes: 10, request: 'foo' },
    { '@timestamp': 1, ssl: true, ip: '192.168.0.1', extension: 'php', 'machine.os': 'Linux', bytes: 20, request: 'bar' },
    { '@timestamp': 2, ssl: true, ip: '192.168.0.1', extension: 'php', 'machine.os': 'Linux', bytes: 30, request: 'bar' },
    { '@timestamp': 3, ssl: true, ip: '192.168.0.1', extension: 'php', 'machine.os': 'Linux', bytes: 30, request: 'baz' },
    { '@timestamp': 4, ssl: true, ip: '192.168.0.1', extension: 'php', 'machine.os': 'Linux', bytes: 30, request: 'baz' },
    { '@timestamp': 5, ssl: true, ip: '192.168.0.1', extension: 'php', 'machine.os': 'Linux', bytes: 30, request: 'baz' },
    { '@timestamp': 6, ssl: true, ip: '192.168.0.1', extension: 'php', 'machine.os': 'Linux', bytes: 40.141592, request: 'bat' },
    { '@timestamp': 7, ssl: true, ip: '192.168.0.1', extension: 'php', 'machine.os': 'Linux', bytes: 40.141592, request: 'bat' },
    { '@timestamp': 8, ssl: true, ip: '192.168.0.1', extension: 'php', 'machine.os': 'Linux', bytes: 40.141592, request: 'bat' },
    { '@timestamp': 9, ssl: true, ip: '192.168.0.1', extension: 'php', 'machine.os': 'Linux', bytes: 40.141592, request: 'bat' },
  ].map((_source, i) => ({
    _score: 1,
    _id: 1000 + i,
    _type: 'test',
    _index: 'test-index',
    _source
  }));
}
