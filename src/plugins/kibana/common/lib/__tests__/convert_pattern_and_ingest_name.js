import expect from 'expect.js';
import {patternToIngest, ingestToPattern} from '../convert_pattern_and_ingest_name';

describe('convertPatternAndTemplateName', function () {

  describe('ingestToPattern', function () {

    it('should convert an index template\'s name to its matching index pattern\'s title', function () {
      expect(ingestToPattern('kibana-logstash-*')).to.be('logstash-*');
    });

    it('should throw an error if the template name isn\'t a valid kibana namespaced name', function () {
      expect(ingestToPattern).withArgs('logstash-*').to.throwException('not a valid kibana namespaced template name');
      expect(ingestToPattern).withArgs('').to.throwException(/not a valid kibana namespaced template name/);
    });

  });

  describe('patternToIngest', function () {

    it('should convert an index pattern\'s title to its matching index template\'s name', function () {
      expect(patternToIngest('logstash-*')).to.be('kibana-logstash-*');
    });

    it('should throw an error if the pattern is empty', function () {
      expect(patternToIngest).withArgs('').to.throwException(/pattern must not be empty/);
    });

  });

});
