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

const { resolve, relative, dirname } = require('path');
const Fs = require('fs');
const Rx = require('rxjs');
const { mergeMap, map, debounceTime } = require('rxjs/operators');
const normalize = require('normalize-path');
const { promisify } = require('util');

const watch = require('glob-watcher');
const mkdirp = require('mkdirp'); // eslint-disable-line
const glob = require('fast-glob');

const mkdirpAsync = promisify(mkdirp);
const writeFileAsync = promisify(Fs.writeFile);

const { REPO_ROOT, STORY_ENTRY_PATH } = require('./constants');
const STORE_ENTRY_DIR = dirname(STORY_ENTRY_PATH);

exports.generateStorybookEntry = ({ log, storyGlobs }) => {
  const globs = ['built_assets/css/**/*.light.css', ...storyGlobs];
  log.info('Storybook globs:\n', globs);
  const norm = (p) => normalize(relative(STORE_ENTRY_DIR, p));

  return Rx.defer(() =>
    glob(globs, {
      absolute: true,
      cwd: REPO_ROOT,
      onlyFiles: true,
    })
  ).pipe(
    map((paths) => {
      log.info('Discovered Storybook entry points:\n', paths);
      return new Set(paths.map(norm));
    }),
    mergeMap(
      (paths) =>
        new Rx.Observable((observer) => {
          observer.next(paths);

          const chokidar = watch(globs, { cwd: REPO_ROOT })
            .on('add', (path) => {
              observer.next(paths.add(norm(resolve(REPO_ROOT, path))));
            })
            .on('unlink', (path) => {
              observer.next(paths.delete(norm(resolve(REPO_ROOT, path))));
            });

          return () => {
            chokidar.close();
          };
        })
    ),
    debounceTime(200),
    mergeMap(async (paths, i) => {
      await mkdirpAsync(STORE_ENTRY_DIR);

      let content = '';
      for (const path of paths) {
        content += `require('${path}');\n`;
      }

      await writeFileAsync(STORY_ENTRY_PATH, content);

      if (i === 0) {
        log.info('%d paths written to entry file', paths.size);
      } else {
        log.info('entry file updated');
      }
    })
  );
};
