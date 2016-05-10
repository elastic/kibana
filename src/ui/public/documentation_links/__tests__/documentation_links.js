import expect from 'expect.js';
import docLinks from '../documentation_links';
import semver from 'semver';
import metadata from '../../metadata';

const major = semver.major(metadata.version);
const minor = semver.minor(metadata.version);
const urlVersion = `${major}.${minor}`;

describe('documentation link service', function () {

  it('should inject Kibana\'s major.minjor version into doc links', function () {
    expect(docLinks.filebeat.configuration).to.contain(urlVersion);
  });

});
