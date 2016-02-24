
import fromRoot from '../../utils/from_root';
import { chain, memoize } from 'lodash';
import { resolve } from 'path';
import { map, fromNode } from 'bluebird';
import { Glob } from 'glob';

let findSourceFiles = async (patterns, cwd = fromRoot('.')) => {
  patterns = [].concat(patterns || []);

  let matcheses = await map(patterns, async pattern => {
    return await fromNode(cb => {
      let g = new Glob(pattern, {
        cwd: cwd,
        ignore: [
          'node_modules/**/*',
          'bower_components/**/*',
          '**/_*.js'
        ],
        symlinks: findSourceFiles.symlinks,
        statCache: findSourceFiles.statCache,
        realpathCache: findSourceFiles.realpathCache,
        cache: findSourceFiles.cache
      }, cb);
    });
  });

  return chain(matcheses)
  .flatten()
  .uniq()
  .map(match => resolve(cwd, match))
  .value();
};

findSourceFiles.symlinks = {};
findSourceFiles.statCache = {};
findSourceFiles.realpathCache = {};
findSourceFiles.cache = {};

module.exports = findSourceFiles;
