const fs = require('fs');

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

  fs.writeFileSync(`${file}.meta`, JSON.stringify(meta, null, 2));
};
