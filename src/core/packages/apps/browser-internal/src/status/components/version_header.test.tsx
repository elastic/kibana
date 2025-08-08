/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import type { ServerVersion } from '@kbn/core-status-common';
import { VersionHeader } from './version_header';

const buildServerVersion = (parts: Partial<ServerVersion> = {}): ServerVersion => ({
  number: 'version_number',
  build_hash: 'build_hash',
  build_number: 9000,
  build_snapshot: false,
  build_date: '2023-05-15T23:12:09.000Z',
  build_flavor: 'traditional',
  ...parts,
});

describe('VersionHeader', () => {
  it('displays the version', () => {
    const version = buildServerVersion({ number: '8.42.13' });
    const { getByTestId } = renderWithI18n(<VersionHeader version={version} />);

    const versionNode = getByTestId('statusBuildVersion');
    expect(versionNode).toHaveTextContent('VERSION: 8.42.13');
  });

  it('displays the build number', () => {
    const version = buildServerVersion({ build_number: 42 });
    const { getByTestId } = renderWithI18n(<VersionHeader version={version} />);

    const buildNumberNode = getByTestId('statusBuildNumber');
    expect(buildNumberNode).toHaveTextContent('BUILD: 42');
  });

  it('displays the build hash', () => {
    const version = buildServerVersion({ build_hash: 'some_hash' });
    const { getByTestId } = renderWithI18n(<VersionHeader version={version} />);

    const buildHashNode = getByTestId('statusBuildHash');
    expect(buildHashNode).toHaveTextContent('COMMIT: some_hash');
  });
});
