/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

export default function fitsFixture() {
  return [
    //                        extension
    //                        |      machine.os
    //timestamp               |      |        bytes
    //|  ssl   ip             |      |        |   request
    [0, true, '192.168.0.1', 'php', 'Linux', 10, 'foo'],
    [1, true, '192.168.0.1', 'php', 'Linux', 20, 'bar'],
    [2, true, '192.168.0.1', 'php', 'Linux', 30, 'bar'],
    [3, true, '192.168.0.1', 'php', 'Linux', 30, 'baz'],
    [4, true, '192.168.0.1', 'php', 'Linux', 30, 'baz'],
    [5, true, '192.168.0.1', 'php', 'Linux', 40.141592, 'bat'],
    [6, true, '192.168.0.1', 'php', 'Linux', 40.141592, 'bat'],
    [7, true, '192.168.0.1', 'php', 'Linux', 40.141592, 'bat'],
    [8, true, '192.168.0.1', 'php', 'Linux', 40.141592, 'bat'],
    [9, true, '192.168.0.1', 'php', 'Linux', 40.141592, 'bat'],
  ].map((row, i) => {
    return {
      _score: 1,
      _id: 1000 + i,
      _index: 'test-index',
      _source: {
        '@timestamp': row[0],
        ssl: row[1],
        ip: row[2],
        extension: row[3],
        'machine.os': row[4],
        bytes: row[5],
        request: row[6],
      },
    };
  });
}
