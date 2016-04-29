import semver from 'semver';
import metadata from '../metadata';

const major = semver.major(metadata.version);
const minor = semver.minor(metadata.version);
const urlVersion = `${major}.${minor}`;
const baseUrl = 'https://www.elastic.co/';

export default {
  filebeat: {
    installation: `${baseUrl}guide/en/beats/filebeat/${urlVersion}/filebeat-installation.html`,
    configuration: `${baseUrl}guide/en/beats/filebeat/${urlVersion}/filebeat-configuration.html`,
    elasticsearchOutput: `${baseUrl}guide/en/beats/filebeat/${urlVersion}/elasticsearch-output.html`,
    elasticsearchOutputAnchorParameters: `${baseUrl}guide/en/beats/filebeat/${urlVersion}/elasticsearch-output.html#_parameters`,
    startup: `${baseUrl}guide/en/beats/filebeat/${urlVersion}/_step_5_starting_filebeat.html`,
    exportedFields: `${baseUrl}guide/en/beats/filebeat/${urlVersion}/exported-fields.html`
  }
};
