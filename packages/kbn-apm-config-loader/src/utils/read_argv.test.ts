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

import { getArgValue, getArgValues } from './read_argv';

describe('getArgValues', () => {
  it('retrieve the arg value from the provided argv arguments', () => {
    const argValues = getArgValues(
      ['--config', 'my-config', '--foo', '-b', 'bar', '--config', 'other-config', '--baz'],
      '--config'
    );
    expect(argValues).toEqual(['my-config', 'other-config']);
  });

  it('accept aliases', () => {
    const argValues = getArgValues(
      ['--config', 'my-config', '--foo', '-b', 'bar', '-c', 'other-config', '--baz'],
      ['--config', '-c']
    );
    expect(argValues).toEqual(['my-config', 'other-config']);
  });

  it('returns an empty array when the arg is not found', () => {
    const argValues = getArgValues(
      ['--config', 'my-config', '--foo', '-b', 'bar', '-c', 'other-config', '--baz'],
      '--unicorn'
    );
    expect(argValues).toEqual([]);
  });

  it('ignores the flag when no value is provided', () => {
    const argValues = getArgValues(
      ['-c', 'my-config', '--foo', '-b', 'bar', '--config'],
      ['--config', '-c']
    );
    expect(argValues).toEqual(['my-config']);
  });
});

describe('getArgValue', () => {
  it('retrieve the first arg value from the provided argv arguments', () => {
    const argValues = getArgValue(
      ['--config', 'my-config', '--foo', '-b', 'bar', '--config', 'other-config', '--baz'],
      '--config'
    );
    expect(argValues).toEqual('my-config');
  });

  it('accept aliases', () => {
    const argValues = getArgValue(
      ['-c', 'my-config', '--foo', '-b', 'bar', '--config', 'other-config', '--baz'],
      ['--config', '-c']
    );
    expect(argValues).toEqual('my-config');
  });

  it('returns undefined the arg is not found', () => {
    const argValues = getArgValue(
      ['--config', 'my-config', '--foo', '-b', 'bar', '-c', 'other-config', '--baz'],
      '--unicorn'
    );
    expect(argValues).toBeUndefined();
  });
});
