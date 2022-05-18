/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { deleteModalMsg } from './delete_modal_msg';

describe('delete modal content', () => {
  const toDVProps = (title: string, namespaces: string[]) => {
    return {
      id: '1',
      title,
      namespaces,
    };
  };

  test('render', () => {
    expect(deleteModalMsg([toDVProps('logstash-*', ['a', 'b', 'c'])], true)).toMatchSnapshot();
    expect(deleteModalMsg([toDVProps('logstash-*', ['a', 'b', 'c'])], false)).toMatchSnapshot();
    expect(deleteModalMsg([toDVProps('logstash-*', ['*'])], true)).toMatchSnapshot();
    expect(
      deleteModalMsg([toDVProps('logstash-*', ['*']), toDVProps('log*', ['a', 'b', 'c'])], true)
    ).toMatchSnapshot();
  });
});
