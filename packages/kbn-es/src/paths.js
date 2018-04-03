const os = require('os');
const path = require('path');

function useBat(bin) {
  return os.platform().startsWith('win') ? `${bin}.bat` : bin;
}

const tempDir = os.tmpdir();

exports.BASE_PATH = path.resolve(tempDir, 'kbn-es');

exports.GRADLE_BIN = useBat('./gradlew');
exports.ES_BIN = useBat('bin/elasticsearch');
exports.ES_ARCHIVE_PATTERN =
  'distribution/archives/tar/build/distributions/elasticsearch-*.tar.gz';
