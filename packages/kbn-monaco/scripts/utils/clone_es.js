/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { accessSync, mkdirSync } = require('fs');
const { join } = require('path');
const simpleGit = require('simple-git');

// Note: The generated allowlists have not yet been merged to ES
// so this script may fail until code in this branch has been merged:
// https://github.com/stu-elastic/elasticsearch/tree/scripting/whitelists
const esRepo = 'https://github.com/elastic/elasticsearch.git';

const esFolder = join(__dirname, '..', '..', 'elasticsearch');
const esPainlessContextFolder = join(
  esFolder,
  'modules',
  'lang-painless',
  'src',
  'main',
  'generated',
  'whitelist-json'
);

/**
 * Checks if the given path exists
 * @param {string} path
 * @returns {boolean} true if exists, false if not
 */
const pathExist = (path) => {
  try {
    accessSync(path);
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Creates the given folder
 * @param {string} name
 * @returns {boolean} true on success, false on failure
 */
const createFolder = (name) => {
  try {
    mkdirSync(name);
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Sets the Elasticsearch repository to the given branch or tag.
 * If the repository is not present in `esFolder` it will
 * clone the repository and the checkout the branch or tag.
 * If the repository is already present but it cannot checkout to
 * the given tag, it will perform a pull and then try again.
 *
 * This code was largely borrowed from the ES JS client:
 * https://github.com/elastic/elasticsearch-js/blob/master/scripts/utils/clone-es.js
 *
 * @param {object} options
 * @param {function} callback
 */
const cloneAndCheckout = (opts, callback) => {
  const { log, tag, branch } = opts;

  let fresh = false;
  let retry = 0;

  if (!pathExist(esFolder)) {
    if (!createFolder(esFolder)) {
      log.fail('Failed to create ES folder');
      return;
    }
    fresh = true;
  }

  const git = simpleGit(esFolder);

  const pull = (cb) => {
    log.text = 'Pulling Elasticsearch repository';

    git.pull((err) => {
      if (err) {
        callback(err, { esPainlessContextFolder });
        return;
      }
      cb();
    });
  };

  const clone = (cb) => {
    log.text = 'Cloning Elasticsearch repository';

    git.clone(esRepo, esFolder, (err) => {
      if (err) {
        callback(err, { esPainlessContextFolder });
        return;
      }
      cb();
    });
  };

  const checkout = (alsoPull = false) => {
    if (branch) {
      log.text = `Checking out branch '${branch}'`;
    } else {
      log.text = `Checking out tag '${tag}'`;
    }

    git.checkout(branch || tag, (err) => {
      if (err) {
        if (retry++ > 0) {
          callback(new Error(`Cannot checkout '${branch || tag}'`), { esPainlessContextFolder });
          return;
        }
        return pull(checkout);
      }
      if (alsoPull) {
        return pull(checkout);
      }
      callback(null, { esPainlessContextFolder });
    });
  };

  if (fresh) {
    clone(checkout);
  } else {
    checkout(Boolean(opts.branch));
  }
};

module.exports = cloneAndCheckout;
