
require('thenify-all')(
  require('child_process'),
  exports, [
    'exec',
    'execFile',
  ]
)
