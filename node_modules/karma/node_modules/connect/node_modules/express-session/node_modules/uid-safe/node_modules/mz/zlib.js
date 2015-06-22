
require('thenify-all')(
  require('zlib'),
  exports, [
    'deflate',
    'deflateRaw',
    'gzip',
    'gunzip',
    'inflate',
    'inflateRaw',
    'unzip',
  ]
)
