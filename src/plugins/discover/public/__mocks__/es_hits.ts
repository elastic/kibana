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
export const esHits = [
  {
    _index: 'i',
    _id: '1',
    _score: 1,
    _type: '_doc',
    _source: { date: '2020-20-01T12:12:12.123', message: 'test1', bytes: 20 },
  },
  {
    _index: 'i',
    _id: '2',
    _score: 1,
    _type: '_doc',
    _source: { date: '2020-20-01T12:12:12.124', name: 'test2', extension: 'jpg' },
  },
  {
    _index: 'i',
    _id: '3',
    _score: 1,
    _type: '_doc',
    _source: { date: '2020-20-01T12:12:12.124', name: 'test3', extension: 'gif', bytes: 50 },
  },
  {
    _index: 'i',
    _id: '4',
    _score: 1,
    _type: '_doc',
    _source: { date: '2020-20-01T12:12:12.125', name: 'test4', extension: 'png', bytes: 50 },
  },
  {
    _index: 'i',
    _id: '5',
    _score: 1,
    _type: '_doc',
    _source: { date: '2020-20-01T12:12:12.128', name: 'test5', extension: 'doc', bytes: 50 },
  },
];
