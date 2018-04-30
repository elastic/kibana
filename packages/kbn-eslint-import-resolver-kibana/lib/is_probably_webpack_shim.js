const { readdirSync } = require('fs');
const { join, dirname } = require('path');

const LRU = require('lru-cache');

const { isDirectory } = require('./get_path_type');

const cache = process.env.KIBANA_RESOLVER_HARD_CACHE
  ? new Map()
  : new LRU({ max: 1000 });

function readShimNames(shimDirectory) {
  if (!isDirectory(shimDirectory)) {
    return [];
  }

  return readdirSync(shimDirectory)
    .filter(name => !name.startsWith('.') && !name.startsWith('_'))
    .map(name => (name.endsWith('.js') ? name.slice(0, -3) : name));
}

function findRelativeWebpackShims(directory) {
  const cached = cache.get(directory);
  if (cached) {
    return cached;
  }

  const ownShims = readShimNames(join(directory, 'webpackShims'));

  const parent = dirname(directory);
  const parentShims =
    parent !== directory ? findRelativeWebpackShims(parent) : [];

  const allShims = !ownShims.length
    ? parentShims
    : ownShims.concat(parentShims);

  cache.set(directory, allShims);
  return allShims;
}

exports.isProbablyWebpackShim = function(source, file) {
  const shims = findRelativeWebpackShims(dirname(file));
  return shims.some(shim => source === shim || source.startsWith(shim + '/'));
};
