const os = require('os');
const path = require('path');

function useBat(bin) {
  return os.platform().startsWith('win') ? `${bin}.bat` : bin;
}

const tempDir = os.tmpdir();

exports.BASE_PATH = path.resolve(tempDir, 'kbn-es');

exports.GRADLE_BIN = useBat('./gradlew');
exports.ES_BIN = useBat('bin/elasticsearch');
exports.ES_CONFIG = 'config/elasticsearch.yml';

exports.ES_KEYSTORE_BIN = useBat('./bin/elasticsearch-keystore');

exports.ES_ARCHIVE_PATTERN =
  'distribution/archives/tar/build/distributions/elasticsearch-*-SNAPSHOT.tar.gz';
exports.ES_OSS_ARCHIVE_PATTERN =
  'distribution/archives/oss-tar/build/distributions/elasticsearch-*-SNAPSHOT.tar.gz';
