/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { computeName } from '../utils';

describe(`Creep and Util fns`, () => {
  describe(`computeName fn`, () => {
    const kbnArchiveFixturesDir = `kibana/x-pack/test/functional/fixtures/kbn_archiver`;
    const esArchiveName = `kibana/x-pack/test/functional/es_archives/actions`;

    it(`should compute esAchiveName to a kbnArchiveName, that can me used to create the needed directory`, () => {
      const expected = `kibana/x-pack/test/functional/fixtures/kbn_archiver/actions`;
      const actual = computeName(kbnArchiveFixturesDir)(esArchiveName);
      expect(actual).toBe(expected);
    });
  });
});
