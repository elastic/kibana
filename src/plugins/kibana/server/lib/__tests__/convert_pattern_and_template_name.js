import expect from 'expect.js';
import {templateToPattern, patternToTemplate} from '../convert_pattern_and_template_name';

describe('convertPatternAndTemplateName', function () {

  describe('templateToPattern', function () {

    it('should convert an index template\'s name to its matching index pattern\'s title', function () {
      expect(templateToPattern('kibana-logstash-*')).to.be('logstash-*');
    });

    it('should throw an error if the template name isn\'t a valid kibana namespaced name', function () {
      expect(templateToPattern).withArgs('logstash-*').to.throwException('not a valid kibana namespaced template name');
      expect(templateToPattern).withArgs('').to.throwException(/not a valid kibana namespaced template name/);
    });

  });

  describe('patternToTemplate', function () {

    it('should convert an index pattern\'s title to its matching index template\'s name', function () {
      expect(patternToTemplate('logstash-*')).to.be('kibana-logstash-*');
    });

    it('should throw an error if the pattern is empty', function () {
      expect(patternToTemplate).withArgs('').to.throwException(/pattern must not be empty/);
    });

  });

});
