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

import { injectedMetadataServiceMock } from '../injected_metadata/injected_metadata_service.mock';
import { BasePathService } from './base_path_service';

function setupService(options: any = {}) {
  const injectedBasePath: string =
    options.injectedBasePath === undefined ? '/foo/bar' : options.injectedBasePath;

  const service = new BasePathService();

  const injectedMetadata = injectedMetadataServiceMock.createSetupContract();
  injectedMetadata.getBasePath.mockReturnValue(injectedBasePath);

  const setupContract = service.setup({
    injectedMetadata,
  });

  return {
    service,
    setupContract,
    injectedBasePath,
  };
}

describe('setup.get()', () => {
  it('returns an empty string if no basePath is injected', () => {
    const { setupContract } = setupService({ injectedBasePath: null });
    expect(setupContract.get()).toBe('');
  });

  it('returns the injected basePath', () => {
    const { setupContract } = setupService();
    expect(setupContract.get()).toBe('/foo/bar');
  });
});

describe('setup.addToPath()', () => {
  it('adds the base path to the path if it is relative and starts with a slash', () => {
    const { setupContract } = setupService();
    expect(setupContract.addToPath('/a/b')).toBe('/foo/bar/a/b');
  });

  it('leaves the query string and hash of path unchanged', () => {
    const { setupContract } = setupService();
    expect(setupContract.addToPath('/a/b?x=y#c/d/e')).toBe('/foo/bar/a/b?x=y#c/d/e');
  });

  it('returns the path unchanged if it does not start with a slash', () => {
    const { setupContract } = setupService();
    expect(setupContract.addToPath('a/b')).toBe('a/b');
  });

  it('returns the path unchanged it it has a hostname', () => {
    const { setupContract } = setupService();
    expect(setupContract.addToPath('http://localhost:5601/a/b')).toBe('http://localhost:5601/a/b');
  });
});

describe('setup.removeFromPath()', () => {
  it('removes the basePath if relative path starts with it', () => {
    const { setupContract } = setupService();
    expect(setupContract.removeFromPath('/foo/bar/a/b')).toBe('/a/b');
  });

  it('leaves query string and hash intact', () => {
    const { setupContract } = setupService();
    expect(setupContract.removeFromPath('/foo/bar/a/b?c=y#1234')).toBe('/a/b?c=y#1234');
  });

  it('ignores urls with hostnames', () => {
    const { setupContract } = setupService();
    expect(setupContract.removeFromPath('http://localhost:5601/foo/bar/a/b')).toBe(
      'http://localhost:5601/foo/bar/a/b'
    );
  });

  it('returns slash if path is just basePath', () => {
    const { setupContract } = setupService();
    expect(setupContract.removeFromPath('/foo/bar')).toBe('/');
  });

  it('returns full path if basePath is not its own segment', () => {
    const { setupContract } = setupService();
    expect(setupContract.removeFromPath('/foo/barhop')).toBe('/foo/barhop');
  });
});
