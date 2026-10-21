/**
 * Measurement preload. Caps only the capability-kit worker.
 * Other Worker constructors in the process keep the main heap limit.
 * Limits are re-read from T7P_WORKER_LIMITS_FILE on each matching construction
 * so a sweep can change the cap without restarting Kibana.
 */
'use strict';

const fs = require('fs');
const Module = require('module');

const readLimits = (env = process.env) => {
  const file = env.T7P_WORKER_LIMITS_FILE;
  if (!file) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const limits = {};
    for (const key of ['maxOldGenerationSizeMb', 'maxYoungGenerationSizeMb']) {
      const value = parsed[key];
      if (value == null || value === '') continue;
      const number = Number(value);
      if (!Number.isInteger(number) || number < 1) continue;
      limits[key] = number;
    }
    return limits;
  } catch {
    return {};
  }
};

const appliesTo = (filename) =>
  typeof filename === 'string' && filename.includes('worker_bootstrap');

const workerThreadIds = new Set(['worker_threads', 'node:worker_threads']);

/** --max-old-space-size on the parent overrides Worker resourceLimits. */
const withoutOldSpaceFlag = (argv) =>
  (argv || []).filter((arg) => !String(arg).includes('max-old-space-size'));

const withoutOldSpaceEnv = (env) => {
  const next = { ...env };
  if (typeof next.NODE_OPTIONS === 'string') {
    next.NODE_OPTIONS = next.NODE_OPTIONS.replace(/--max-old-space-size(?:=|\s+)\d+/g, '').trim();
  }
  return next;
};

const originalRequire = Module.prototype.require;
if (!Module.prototype.require.__t7pWorkerLimits) {
  const patched = function patchedRequire(id) {
    const exported = originalRequire.apply(this, arguments);
    if (
      workerThreadIds.has(id) &&
      exported &&
      typeof exported.Worker === 'function' &&
      !exported.Worker.__t7pPatched
    ) {
      const OriginalWorker = exported.Worker;
      function LimitedWorker(filename, options) {
        const opts = options == null ? {} : { ...options };
        if (appliesTo(filename)) {
          const limits = { ...(opts.resourceLimits || {}), ...readLimits() };
          if (Object.keys(limits).length > 0) {
            opts.resourceLimits = limits;
            opts.execArgv = withoutOldSpaceFlag(
              Array.isArray(opts.execArgv) ? opts.execArgv : process.execArgv
            );
            opts.env = withoutOldSpaceEnv(opts.env || process.env);
          }
          process.stderr.write(
            `[t7p-worker-limits] ${JSON.stringify({
              entry: String(filename).slice(-120),
              limits: opts.resourceLimits || null,
            })}\n`
          );
        }
        return new OriginalWorker(filename, opts);
      }
      LimitedWorker.__t7pPatched = true;
      Object.setPrototypeOf(LimitedWorker, OriginalWorker);
      exported.Worker = LimitedWorker;
    }
    return exported;
  };
  patched.__t7pWorkerLimits = true;
  Module.prototype.require = patched;
}

module.exports = { readLimits, appliesTo, workerThreadIds, withoutOldSpaceFlag, withoutOldSpaceEnv };
