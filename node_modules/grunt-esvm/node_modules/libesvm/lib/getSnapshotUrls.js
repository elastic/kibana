/* jshint undef:true, node:true */
var _ = require('lodash');
var request = require('request');
var Promise = require('bluebird');
var join = require('path').join;
var pp = require('properties-parser');
var fs = require('fs');
var readFileAsync = Promise.promisify(fs.readFile);
var writeFileAsync = Promise.promisify(fs.writeFile);

var cache = require('./cache');
var resolveSnapshotUrlsPath = require('./resolveSnapshotUrlsPath');

var URL = 'https://download.elasticsearch.org/esvm/snapshot_urls.prop';

module.exports = function (options) {
  var path;
  var fetchTime;
  var storedListText;
  var fetchedListText;
  var log = options.log || _.noop;

  return Promise
  .try(getListPath)
  .then(getListFromDisk)
  .then(getListFetchTime)
  .then(maybeFetchNewList)
  .then(respond);

  function getListPath() {
    return resolveSnapshotUrlsPath(options)
    .then(function (p) {
      path = p;
    });
  }

  function getListFromDisk() {
    return readFileAsync(path, 'utf8')
    .then(function (txt) {
      storedListText = txt;
    })
    .catch(function () {
      // swallow read errors, file just doesn't exist
      return null;
    });
  }

  function getListFetchTime() {
    if (!storedListText) return;

    // get the fetch time to learn if we can trust the stored list
    return cache.get('snapshotUrlsFetchTime')
    .then(function (ms) {
      fetchTime = ms;
    });
  }

  function maybeFetchNewList() {
    if (fetchTime && Date.now() - fetchTime < 120000) {
      // safe to skip for now
      fetchedListText = storedListText;
      return;
    }

    return Promise.all([
      new Promise(function (resolve, reject) {
        request.get(URL, function (err, resp) {
          if (err) reject(err);
          else resolve(resp.body);
        });
      }),
      cache.set('snapshotUrlsFetchTime', Date.now())
    ])
    .catch(function () {
      if (!fetchedListText && storedListText) {
        log('INFO', 'Failed to fetch latest branch snapshot urls, using stale version');
        return storedListText;
      }
    })
    .spread(function (newList) {
      if (!newList) return;

      fetchedListText = newList;
      return writeFileAsync(path, newList, 'utf8');
    });
  }

  function respond() {
    if (!fetchedListText) throw new Error('unable to fetch branch snapshot url list');
    return pp.parse(fetchedListText);
  }
};
