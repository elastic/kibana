/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
