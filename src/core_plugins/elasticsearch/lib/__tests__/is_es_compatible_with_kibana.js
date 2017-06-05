import expect from 'expect.js';

import isEsCompatibleWithKibana from '../is_es_compatible_with_kibana';

describe('plugins/elasticsearch', () => {
  describe('lib/is_es_compatible_with_kibana', () => {
    describe('returns false', () => {
      it('when ES major is greater than Kibana major', () => {
        expect(isEsCompatibleWithKibana('1.0.0', '0.0.0')).to.be(false);
      });

      it('when ES major is less than Kibana major', () => {
        expect(isEsCompatibleWithKibana('0.0.0', '1.0.0')).to.be(false);
      });

      it('when majors are equal, but ES minor is less than Kibana minor', () => {
        expect(isEsCompatibleWithKibana('1.0.0', '1.1.0')).to.be(false);
      });
    });

    describe('returns true', () => {
      it('when version numbers are the same', () => {
        expect(isEsCompatibleWithKibana('1.1.1', '1.1.1')).to.be(true);
      });

      it('when majors are equal, and ES minor is greater than Kibana minor', () => {
        expect(isEsCompatibleWithKibana('1.1.0', '1.0.0')).to.be(true);
      });

      it('when majors and minors are equal, and ES patch is greater than Kibana patch', () => {
        expect(isEsCompatibleWithKibana('1.1.1', '1.1.0')).to.be(true);
      });

      it('when majors and minors are equal, but ES patch is less than Kibana patch', () => {
        expect(isEsCompatibleWithKibana('1.1.0', '1.1.1')).to.be(true);
      });
    });
  });
});
