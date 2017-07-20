import expect from 'expect.js';
import { documentationLinks } from '../documentation_links';
import { metadata } from '../../metadata';

const urlVersion = metadata.branch;

describe('documentation link service', function () {

  it('should inject Kibana\'s major.minjor version into doc links', function () {
    expect(documentationLinks.filebeat.configuration).to.contain(urlVersion);
  });

});
