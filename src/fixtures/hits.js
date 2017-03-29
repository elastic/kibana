export default function fitsFixture() {
  return [
    //                        extension
    //                        |      machine.os
    //timestamp               |      |        bytes
    //|  ssl   ip             |      |        |   request
    [ 0, true, '192.168.0.1', 'php', 'Linux', 10, 'foo' ],
    [ 1, true, '192.168.0.1', 'php', 'Linux', 20, 'bar' ],
    [ 2, true, '192.168.0.1', 'php', 'Linux', 30, 'bar' ],
    [ 3, true, '192.168.0.1', 'php', 'Linux', 30, 'baz' ],
    [ 4, true, '192.168.0.1', 'php', 'Linux', 30, 'baz' ],
    [ 5, true, '192.168.0.1', 'php', 'Linux', 40.141592, 'bat' ],
    [ 6, true, '192.168.0.1', 'php', 'Linux', 40.141592, 'bat' ],
    [ 7, true, '192.168.0.1', 'php', 'Linux', 40.141592, 'bat' ],
    [ 8, true, '192.168.0.1', 'php', 'Linux', 40.141592, 'bat' ],
    [ 9, true, '192.168.0.1', 'php', 'Linux', 40.141592, 'bat' ],
  ].map((row, i) => {
    return {
      _score: 1,
      _id: 1000 + i,
      _type: 'test',
      _index: 'test-index',
      _source: {
        '@timestamp': row[0],
        ssl: row[1],
        ip: row[2],
        extension: row[3],
        'machine.os': row[4],
        bytes: row[5],
        request: row[6],
      }
    };
  });
}
