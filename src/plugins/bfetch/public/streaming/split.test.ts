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

import { split } from './split';
import { Subject } from 'rxjs';

test('splits a single IP address', () => {
  const ip = '127.0.0.1';
  const list: string[] = [];
  const subject = new Subject<string>();
  const splitted = split('.')(subject);

  splitted.subscribe((value) => list.push(value));

  subject.next(ip);
  subject.complete();
  expect(list).toEqual(['127', '0', '0', '1']);
});

const streams = [
  'adsf.asdf.asdf',
  'single.dot',
  'empty..split',
  'trailingdot.',
  '.leadingdot',
  '.',
  '....',
  'no_delimiter',
  '1.2.3.4.5',
  '1.2.3.4.5.',
  '.1.2.3.4.5.',
  '.1.2.3.4.5',
];

for (const stream of streams) {
  test(`splits stream by delimiter correctly "${stream}"`, () => {
    const correctResult = stream.split('.').filter(Boolean);

    for (let j = 0; j < 100; j++) {
      const list: string[] = [];
      const subject = new Subject<string>();
      const splitted = split('.')(subject);
      splitted.subscribe((value) => list.push(value));
      let i = 0;
      while (i < stream.length) {
        const len = Math.round(Math.random() * 10);
        const chunk = stream.substr(i, len);
        subject.next(chunk);
        i += len;
      }
      subject.complete();
      expect(list).toEqual(correctResult);
    }
  });
}
