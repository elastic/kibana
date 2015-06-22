
require('thenify-all')(
  require('crypto'),
  exports, [
    'pbkdf2',
    'randomBytes',
    'pseudoRandomBytes',
  ]
)
