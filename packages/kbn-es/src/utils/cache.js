const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');

exports.readMeta = function readMeta(file) {
  try {
    const meta = fs.readFileSync(`${file}.meta`, {
      encoding: 'utf8',
    });

    return {
      exists: fs.existsSync(file),
      ...JSON.parse(meta),
    };
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e;
    }

    return {
      exists: false,
    };
  }
};

exports.writeMeta = function readMeta(file, details = {}) {
  const meta = {
    ts: new Date(),
    ...details,
  };

  mkdirp.sync(path.dirname(file));
  fs.writeFileSync(`${file}.meta`, JSON.stringify(meta, null, 2));
};
