
1.2.0 / 2014-12-16
==================

 * refactor promisification to `thenify` and `thenify-all`

1.1.0 / 2014-11-14
==================

 * use `graceful-fs` if available

1.0.1 / 2014-08-18
==================

 * don't use `bluebird.promisify()` - unnecessarily wraps runtime errors, causing issues

1.0.0 / 2014-06-18
==================

 * use `bluebird` by default if found
 * support node 0.8
