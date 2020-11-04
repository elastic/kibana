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

import { REPO_ROOT } from '@kbn/utils';
import { createAbsolutePathSerializer } from '@kbn/dev-utils';

import { Config } from './config';
import { Build } from './build';

expect.addSnapshotSerializer(createAbsolutePathSerializer());

const config = new Config(
  true,
  {
    version: '8.0.0',
    engines: {
      node: '*',
    },
    workspaces: {
      packages: [],
    },
  },
  '1.2.3',
  REPO_ROOT,
  {
    buildNumber: 1234,
    buildSha: 'abcd1234',
    buildVersion: '8.0.0',
  },
  true
);

const linuxPlatform = config.getPlatform('linux', 'x64');
const linuxArmPlatform = config.getPlatform('linux', 'arm64');
const windowsPlatform = config.getPlatform('win32', 'x64');

beforeEach(() => {
  jest.clearAllMocks();
});

const ossBuild = new Build(config, true);
const defaultBuild = new Build(config, false);

describe('#isOss()', () => {
  it('returns true for oss', () => {
    expect(ossBuild.isOss()).toBe(true);
  });

  it('returns false for default build', () => {
    expect(defaultBuild.isOss()).toBe(false);
  });
});

describe('#getName()', () => {
  it('returns kibana for default build', () => {
    expect(defaultBuild.getName()).toBe('kibana');
  });

  it('returns kibana-oss for oss', () => {
    expect(ossBuild.getName()).toBe('kibana-oss');
  });
});

describe('#getLogTag()', () => {
  it('returns string with build name in it', () => {
    expect(defaultBuild.getLogTag()).toContain(defaultBuild.getName());
    expect(ossBuild.getLogTag()).toContain(ossBuild.getName());
  });
});

describe('#resolvePath()', () => {
  it('uses passed config to resolve a path relative to the repo', () => {
    expect(ossBuild.resolvePath('bar')).toMatchInlineSnapshot(
      `<absolute path>/build/kibana-oss/bar`
    );
  });

  it('passes all arguments to config.resolveFromRepo()', () => {
    expect(defaultBuild.resolvePath('bar', 'baz', 'box')).toMatchInlineSnapshot(
      `<absolute path>/build/kibana/bar/baz/box`
    );
  });
});

describe('#resolvePathForPlatform()', () => {
  it('uses config.resolveFromRepo(), config.getBuildVersion(), and platform.getBuildName() to create path', () => {
    expect(ossBuild.resolvePathForPlatform(linuxPlatform, 'foo', 'bar')).toMatchInlineSnapshot(
      `<absolute path>/build/oss/kibana-8.0.0-linux-x86_64/foo/bar`
    );
  });
});

describe('#getPlatformArchivePath()', () => {
  it('creates correct path for different platforms', () => {
    expect(ossBuild.getPlatformArchivePath(linuxPlatform)).toMatchInlineSnapshot(
      `<absolute path>/target/kibana-oss-8.0.0-linux-x86_64.tar.gz`
    );
    expect(ossBuild.getPlatformArchivePath(linuxArmPlatform)).toMatchInlineSnapshot(
      `<absolute path>/target/kibana-oss-8.0.0-linux-aarch64.tar.gz`
    );
    expect(ossBuild.getPlatformArchivePath(windowsPlatform)).toMatchInlineSnapshot(
      `<absolute path>/target/kibana-oss-8.0.0-windows-x86_64.zip`
    );
  });
});
