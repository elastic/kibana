/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { deleteModalMsg } from './delete_modal_msg';

describe('delete modal content', () => {
  const toDVProps = (title: string, name: string, namespaces: string[]) => {
    return {
      id: '1',
      title,
      name,
      namespaces,
      getName: () => title,
    };
  };

  test('render', () => {
    expect(
      deleteModalMsg([toDVProps('logstash-*', 'Logstash Star', ['a', 'b', 'c'])], true)
    ).toMatchSnapshot();
    expect(
      deleteModalMsg([toDVProps('logstash-*', 'Logstash Star', ['a', 'b', 'c'])], false)
    ).toMatchSnapshot();
    expect(
      deleteModalMsg([toDVProps('logstash-*', 'Logstash Star', ['*'])], true)
    ).toMatchSnapshot();
    expect(
      deleteModalMsg(
        [
          toDVProps('logstash-*', 'Logstash Star', ['*']),
          toDVProps('log*', 'Log Star', ['a', 'b', 'c']),
        ],
        true
      )
    ).toMatchSnapshot();
  });
});
