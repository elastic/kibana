/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl, findTestSubject } from '@kbn/test-jest-helpers';
import type { ServerVersion } from '../../../../types/status';
import { VersionHeader } from './version_header';

const buildServerVersion = (parts: Partial<ServerVersion> = {}): ServerVersion => ({
  number: 'version_number',
  build_hash: 'build_hash',
  build_number: 9000,
  build_snapshot: false,
  ...parts,
});

describe('VersionHeader', () => {
  it('displays the version', () => {
    const version = buildServerVersion({ number: '8.42.13' });
    const component = mountWithIntl(<VersionHeader version={version} />);

    const versionNode = findTestSubject(component, 'statusBuildVersion');
    expect(versionNode.text()).toEqual('VERSION: 8.42.13');
  });

  it('displays the build number', () => {
    const version = buildServerVersion({ build_number: 42 });
    const component = mountWithIntl(<VersionHeader version={version} />);

    const buildNumberNode = findTestSubject(component, 'statusBuildNumber');
    expect(buildNumberNode.text()).toEqual('BUILD: 42');
  });

  it('displays the build hash', () => {
    const version = buildServerVersion({ build_hash: 'some_hash' });
    const component = mountWithIntl(<VersionHeader version={version} />);

    const buildHashNode = findTestSubject(component, 'statusBuildHash');
    expect(buildHashNode.text()).toEqual('COMMIT: some_hash');
  });
});
