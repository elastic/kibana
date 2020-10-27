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

// TODO: Temporarily pointing to Stu's fork
const esRepo = 'https://github.com/stu-elastic/elasticsearch.git';

const esFolder = join(__dirname, '..', '..', 'elasticsearch');
const generatedFolder = join(esFolder, 'modules', 'lang-painless', 'src', 'main', 'generated');

function cloneAndCheckout(opts, callback) {
  const { tag, branch } = opts;
  withTag(tag, callback);

  /**
   * Sets the elasticsearch repository to the given tag.
   * If the repository is not present in `esFolder` it will
   * clone the repository and the checkout the tag.
   * If the repository is already present but it cannot checkout to
   * the given tag, it will perform a pull and then try again.
   * @param {string} tag
   * @param {function} callback
   */
  function withTag(tag, callback) {
    let fresh = false;
    let retry = 0;

    if (!pathExist(esFolder)) {
      if (!createFolder(esFolder)) {
        return;
      }
      fresh = true;
    }

    const git = simpleGit(esFolder);

    if (fresh) {
      clone(checkout);
    } else if (opts.branch) {
      checkout(true);
    } else {
      checkout();
    }

    function checkout(alsoPull = false) {
      git.checkout(branch || tag, (err) => {
        if (err) {
          if (retry++ > 0) {
            callback(new Error(`Cannot checkout tag '${tag}'`), { generatedFolder });
            return;
          }
          return pull(checkout);
        }
        if (alsoPull) {
          return pull(checkout);
        }
        callback(null, { generatedFolder });
      });
    }

    function pull(cb) {
      git.pull((err) => {
        if (err) {
          callback(err, { generatedFolder });
          return;
        }
        cb();
      });
    }

    function clone(cb) {
      git.clone(esRepo, esFolder, (err) => {
        if (err) {
          callback(err, { generatedFolder });
          return;
        }
        cb();
      });
    }
  }

  /**
   * Checks if the given path exists
   * @param {string} path
   * @returns {boolean} true if exists, false if not
   */
  function pathExist(path) {
    try {
      accessSync(path);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Creates the given folder
   * @param {string} name
   * @returns {boolean} true on success, false on failure
   */
  function createFolder(name) {
    try {
      mkdirSync(name);
      return true;
    } catch (err) {
      return false;
    }
  }
}

module.exports = cloneAndCheckout;
