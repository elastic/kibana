/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-restricted-syntax */

const singlePath = new Set([
  'writeFile',
  'writeFileSync',
  'appendFile',
  'appendFileSync',
  'createWriteStream',
]);

const dualPath = new Set(['copyFile', 'copyFileSync', 'rename', 'renameSync']);

const { REPO_ROOT } = require('@kbn/repo-info');

const fsEventBus = require('@kbn/security-hardening/fs-event-bus');

const { join, normalize } = require('path');
const { homedir, tmpdir } = require('os');
const {
  realpathSync,
  createWriteStream,
  writeFile,
  writeFileSync,
  appendFile,
  appendFileSync,
  copyFile,
  copyFileSync,
  rename,
  renameSync,
} = require('fs');

const isDevOrCI = process.env.NODE_ENV !== 'production' || process.env.CI === 'true';
const baseSafePaths = [join(REPO_ROOT, 'data'), join(REPO_ROOT, '.es')];

const tmpPath = tmpdir();

const getRealTmpPath = () => {
  let realTmpPath;
  try {
    realTmpPath = realpathSync(tmpPath);
  } catch (e) {
    realTmpPath = tmpPath;
  }

  return realTmpPath;
};

const devOrCIPaths = [
  REPO_ROOT,
  tmpdir(),
  getRealTmpPath(),
  join(homedir(), '.kibanaSecuritySolutionCliTools'),
  'target',
  '/target',
  '/opt/buildkite-agent',
  '/output',
  'cache-test',
];

const safePaths = [...baseSafePaths, ...(isDevOrCI ? devOrCIPaths : [])];

const realMethods = {
  createWriteStream,
  writeFile,
  writeFileSync,
  appendFile,
  appendFileSync,
  copyFile,
  copyFileSync,
  rename,
  renameSync,
};

// TODO: propagate here file specified for file logger (it can change in the runtime)
// Idea 1: Use EventEmitter to propagate file logger path.
// Checked it, it works, though we need to find a proper folder/package for that event emitter.
fsEventBus.on('kbn_config_changed', ({ loggerFilePath }) => {
  safePaths.push(loggerFilePath);
});

const getSafePath = (userPath) => {
  const normalizedPath = normalize(userPath);

  if (
    isDevOrCI &&
    (normalizedPath.endsWith('.txt') ||
      normalizedPath.endsWith('.md') ||
      normalizedPath.endsWith('.log'))
  ) {
    return normalizedPath;
  }

  if (!safePaths.some((path) => normalizedPath.startsWith(path))) {
    throw new Error(`Unsafe path detected: "${normalizedPath}".`);
  }

  return normalizedPath;
};

const isMockFsActive = () => {
  try {
    // This is the most reliable way to detect mock-fs
    // It checks the internal binding that mock-fs modifies
    const realBinding = process.binding('fs');
    return !!realBinding._mockedBinding;
  } catch (e) {
    // If process.binding is not available (it's deprecated), fallback to other methods
    return false;
  }
};

const patchFs = (fs) => {
  const proxiedFs = new Proxy(fs, {
    get(target, prop) {
      const isSyncMethod = typeof prop === 'string' && prop.endsWith('Sync');

      if (isSyncMethod && singlePath.has(prop)) {
        return (userPath, ...args) => {
          if (isMockFsActive()) {
            // Use the original createWriteStream function directly to avoid infinite recursion.
            // When mock-fs is active, it replaces the fs.createWriteStream with its own implementation,
            // which internally calls a stored reference to our proxy function.
            // This creates an infinite loop: proxy -> mock-fs -> proxy -> mock-fs
            return realMethods[prop](userPath, ...args);
          }

          const safePath = getSafePath(userPath);

          return Reflect.apply(target[prop], target, [safePath, ...args]);
        };
      }

      if (isSyncMethod && dualPath.has(prop)) {
        return (userSrc, userDest, ...args) => {
          if (isMockFsActive()) {
            // Use the original function directly to avoid infinite recursion.
            // When mock-fs is active, it replaces the fs.[method] with its own implementation,
            // which internally calls a stored reference to our proxy function.
            // This creates an infinite loop: proxy -> mock-fs -> proxy -> mock-fs
            return realMethods[prop](userSrc, userDest, ...args);
          }

          const srcSafePath = getSafePath(userSrc);
          const destSafePath = getSafePath(userDest);

          return Reflect.apply(target[prop], target, [srcSafePath, destSafePath, ...args]);
        };
      }

      if (singlePath.has(prop) && typeof target[prop] === 'function') {
        return (userPath, data, options, cb) => {
          if (isMockFsActive()) {
            // Use the original function directly to avoid infinite recursion.
            // When mock-fs is active, it replaces the fs.[method] with its own implementation,
            // which internally calls a stored reference to our proxy function.
            // This creates an infinite loop: proxy -> mock-fs -> proxy -> mock-fs
            return realMethods[prop](userPath, data, options, cb);
          }

          cb ||= options;
          let safePath;

          try {
            safePath = getSafePath(userPath);
          } catch (err) {
            // ensure that we invoke the callback asynchronously
            if (typeof cb === 'function') return process.nextTick(() => cb(err));

            throw err;
          }

          return Reflect.apply(target[prop], target, [safePath, data, options, cb]);
        };
      }

      if (dualPath.has(prop) && typeof target[prop] === 'function') {
        return (userSrc, userDest, data, options, cb) => {
          if (isMockFsActive()) {
            return realMethods[prop](userSrc, userDest, data, options, cb);
          }

          cb ||= options;
          let srcSafePath;
          let destSafePath;

          try {
            srcSafePath = getSafePath(userSrc);
            destSafePath = getSafePath(userDest);
          } catch (err) {
            // ensure that we invoke the callback asynchronously
            if (typeof cb === 'function') return process.nextTick(() => cb(err));

            throw err;
          }

          return Reflect.apply(target[prop], target, [
            srcSafePath,
            destSafePath,
            data,
            options,
            cb,
          ]);
        };
      }

      return Reflect.get(target, prop);
    },
  });

  return proxiedFs;
};

module.exports = patchFs;
