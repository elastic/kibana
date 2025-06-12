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

// const fsEventBus = require('../../platform/packages/shared/kbn-security-hardening/fs-event-bus'); // eslint-disable-line @kbn/imports/uniform_imports

const { join, normalize } = require('path');
const { homedir, tmpdir } = require('os');

const isDevOrCI = process.env.NODE_ENV !== 'production' || process.env.CI === 'true';

// TODO: propagate here file specified for file logger (it can change in the runtime)
// Idea 1: Use EventEmitter to propagate file logger path.
// Checked it, it works, though we need to find a proper folder/package for that event emitter.
const baseSafePaths = [join(REPO_ROOT, 'data'), join(REPO_ROOT, '.es')];
const devOrCIPaths = [REPO_ROOT, tmpdir(), join(homedir(), '.kibanaSecuritySolutionCliTools')];

const safePaths = [...baseSafePaths, ...(isDevOrCI ? devOrCIPaths : [])];

const getSafePath = (userPath) => {
  const normalizedPath = normalize(userPath);

  if (!safePaths.some((path) => normalizedPath.startsWith(path))) {
    throw new Error(`Unsafe path detected: "${userPath}".`);
  }

  return normalizedPath;
};

// fsEventBus.on('kbn_config_changed', ({ loggerFilePath }) => {
//   console.log('Logger path changed:', loggerFilePath);
//   safePaths.push(loggerFilePath);
// });

const patchFs = (fs) => {
  return new Proxy(fs, {
    get(target, prop) {
      const isSyncMethod = typeof prop === 'string' && prop.endsWith('Sync');

      if (isSyncMethod && singlePath.has(prop)) {
        return (userPath, ...args) => {
          const safePath = getSafePath(userPath);

          return Reflect.apply(target[prop], target, [safePath, ...args]);
        };
      }

      if (isSyncMethod && dualPath.has(prop)) {
        return (userSrc, userDest, ...args) => {
          const srcSafePath = getSafePath(userSrc);
          const destSafePath = getSafePath(userDest);

          return Reflect.apply(target[prop], target, [srcSafePath, destSafePath, ...args]);
        };
      }

      if (singlePath.has(prop) && typeof target[prop] === 'function') {
        return (userPath, data, options, cb) => {
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
};

module.exports = patchFs;
