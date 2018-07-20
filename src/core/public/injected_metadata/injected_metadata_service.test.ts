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

import { InjectedMetadataService } from './injected_metadata_service';

describe('#start()', () => {
  it('deeply freezes its injectedMetadata param', () => {
    const params = {
      injectedMetadata: { foo: true } as any,
    };

    const injectedMetadata = new InjectedMetadataService(params);

    expect(() => {
      params.injectedMetadata.foo = false;
    }).not.toThrowError();

    injectedMetadata.start();

    expect(() => {
      params.injectedMetadata.foo = true;
    }).toThrowError(`read only property 'foo'`);
  });
});

describe('start.getLegacyMetadata()', () => {
  it('returns injectedMetadata.legacyMetadata', () => {
    const injectedMetadata = new InjectedMetadataService({
      injectedMetadata: {
        legacyMetadata: 'foo',
      } as any,
    });

    const contract = injectedMetadata.start();
    expect(contract.getLegacyMetadata()).toBe('foo');
  });
});
