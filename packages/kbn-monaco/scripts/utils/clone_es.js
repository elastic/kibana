/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
