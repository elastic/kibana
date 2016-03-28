'use strict';

module.exports = {
    rules: {
        'no-exclusive-tests': require('./lib/rules/no-exclusive-tests'),
        'handle-done-callback': require('./lib/rules/handle-done-callback'),
        'no-synchronous-tests': require('./lib/rules/no-synchronous-tests'),
        'no-global-tests': require('./lib/rules/no-global-tests')
    }
};
