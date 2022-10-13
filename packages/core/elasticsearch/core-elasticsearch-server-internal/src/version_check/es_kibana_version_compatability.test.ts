/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { esVersionCompatibleWithKibana } from './es_kibana_version_compatability';

describe('plugins/elasticsearch', () => {
  describe('lib/is_es_compatible_with_kibana', () => {
    describe('returns false', () => {
      it('when ES major is greater than Kibana major', () => {
        expect(esVersionCompatibleWithKibana('1.0.0', '0.0.0')).toBe(false);
      });

      it('when ES major is less than Kibana major', () => {
        expect(esVersionCompatibleWithKibana('0.0.0', '1.0.0')).toBe(false);
      });

      it('when majors are equal, but ES minor is less than Kibana minor', () => {
        expect(esVersionCompatibleWithKibana('1.0.0', '1.1.0')).toBe(false);
      });
    });

    describe('returns true', () => {
      it('when version numbers are the same', () => {
        expect(esVersionCompatibleWithKibana('1.1.1', '1.1.1')).toBe(true);
      });

      it('when majors are equal, and ES minor is greater than Kibana minor', () => {
        expect(esVersionCompatibleWithKibana('1.1.0', '1.0.0')).toBe(true);
      });

      it('when majors and minors are equal, and ES patch is greater than Kibana patch', () => {
        expect(esVersionCompatibleWithKibana('1.1.1', '1.1.0')).toBe(true);
      });

      it('when majors and minors are equal, but ES patch is less than Kibana patch', () => {
        expect(esVersionCompatibleWithKibana('1.1.0', '1.1.1')).toBe(true);
      });
    });
  });
});
