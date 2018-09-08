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

import { BasePathService } from './base_path_service';

function setup(options: any = {}) {
  const injectedBasePath: string =
    options.injectedBasePath === undefined ? '/foo/bar' : options.injectedBasePath;

  const service = new BasePathService();

  const injectedMetadata = {
    getBasePath: jest.fn().mockReturnValue(injectedBasePath),
  } as any;

  const startContract = service.start({
    injectedMetadata,
  });

  return {
    service,
    startContract,
    injectedBasePath,
  };
}

describe('startContract.get()', () => {
  it('returns an empty string if no basePath is injected', () => {
    const { startContract } = setup({ injectedBasePath: null });
    expect(startContract.get()).toBe('');
  });

  it('returns the injected basePath', () => {
    const { startContract } = setup();
    expect(startContract.get()).toBe('/foo/bar');
  });
});

describe('startContract.addToPath()', () => {
  it('adds the base path to the path if it is relative and starts with a slash', () => {
    const { startContract } = setup();
    expect(startContract.addToPath('/a/b')).toBe('/foo/bar/a/b');
  });

  it('leaves the query string and hash of path unchanged', () => {
    const { startContract } = setup();
    expect(startContract.addToPath('/a/b?x=y#c/d/e')).toBe('/foo/bar/a/b?x=y#c/d/e');
  });

  it('returns the path unchanged if it does not start with a slash', () => {
    const { startContract } = setup();
    expect(startContract.addToPath('a/b')).toBe('a/b');
  });

  it('returns the path unchanged it it has a hostname', () => {
    const { startContract } = setup();
    expect(startContract.addToPath('http://localhost:5601/a/b')).toBe('http://localhost:5601/a/b');
  });
});

describe('startContract.removeFromPath()', () => {
  it('removes the basePath if relative path starts with it', () => {
    const { startContract } = setup();
    expect(startContract.removeFromPath('/foo/bar/a/b')).toBe('/a/b');
  });

  it('leaves query string and hash intact', () => {
    const { startContract } = setup();
    expect(startContract.removeFromPath('/foo/bar/a/b?c=y#1234')).toBe('/a/b?c=y#1234');
  });

  it('ignores urls with hostnames', () => {
    const { startContract } = setup();
    expect(startContract.removeFromPath('http://localhost:5601/foo/bar/a/b')).toBe(
      'http://localhost:5601/foo/bar/a/b'
    );
  });

  it('returns slash if path is just basePath', () => {
    const { startContract } = setup();
    expect(startContract.removeFromPath('/foo/bar')).toBe('/');
  });

  it('returns full path if basePath is not its own segment', () => {
    const { startContract } = setup();
    expect(startContract.removeFromPath('/foo/barhop')).toBe('/foo/barhop');
  });
});
