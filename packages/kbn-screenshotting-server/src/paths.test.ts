/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChromiumArchivePaths } from './paths';

describe('ChromiumArchivePaths', () => {
  it('should download chromium archive to a specific path', () => {
    const ChromiumArchivePathsInstance = new ChromiumArchivePaths();
    expect(ChromiumArchivePathsInstance.archivesPath).toEqual(
      expect.stringContaining('kibana/.chromium')
    );
  });
});
