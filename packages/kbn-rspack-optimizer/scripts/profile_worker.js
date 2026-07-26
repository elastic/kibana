/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Profile worker - runs RSPack build with profiling in a clean process.
 *
 * This script uses a minimal setup that avoids require-in-the-middle (from harden),
 * which conflicts with envinfo (used by RsDoctor).
 *
 * Only loads:
 * - source-map-support for stack traces
 * - @kbn/babel-register for TypeScript transpilation
 *
 * Does NOT load:
 * - @kbn/setup-node-env (which includes harden with require-in-the-middle)
 * - @kbn/security-hardening
 */

/* eslint-disable no-var */

// Minimal setup - just what we need for TypeScript support
require('source-map-support').install();
require('@kbn/babel-register').install();

// Now load the profiler
var Path = require('path');
var Fs = require('fs');
var getopts = require('getopts');
var { ToolingLog, pickLevelFromFlags } = require('@kbn/tooling-log');
var { runBuild } = require('../src/run_build');

var repoRoot = Path.resolve(__dirname, '../../..');

// Check if stats-only mode (skip RsDoctor)
var statsOnly = process.env.RSPACK_PROFILE_STATS_ONLY === 'true';

// Parse command line arguments (same as main CLI, minus --profile and --profile-stats-only)
var args = getopts(process.argv.slice(2), {
  boolean: ['dist', 'examples', 'test-plugins', 'no-cache', 'verbose', 'quiet'],
  string: ['themes', 'output-root', 'profile-focus', 'limits'],
  default: {
    dist: false,
    examples: false,
    'test-plugins': false,
    'no-cache': false,
  },
});

var log = new ToolingLog({
  level: pickLevelFromFlags({
    verbose: args.verbose,
    quiet: args.quiet,
  }),
  writeTo: process.stdout,
});

// Parse themes
var VALID_THEMES = ['borealislight', 'borealisdark'];
function parseThemes(themesArg) {
  if (!themesArg || themesArg === '*') {
    return VALID_THEMES;
  }
  var themes = themesArg.split(',').map(function (s) {
    return s.trim();
  });
  themes.forEach(function (theme) {
    if (!VALID_THEMES.includes(theme)) {
      log.warning('Unknown theme "' + theme + '", valid themes are: ' + VALID_THEMES.join(', '));
    }
  });
  return themes.filter(function (t) {
    return VALID_THEMES.includes(t);
  });
}

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Get bundle size summary from output directory
function getBundleSummary(bundlesDir) {
  var summary = {
    total: 0,
    mainBundle: 0,
    chunks: 0,
    chunkCount: 0,
    largestChunks: [],
  };

  try {
    // Main bundle
    var mainBundlePath = Path.join(bundlesDir, 'kibana.bundle.js');
    if (Fs.existsSync(mainBundlePath)) {
      summary.mainBundle = Fs.statSync(mainBundlePath).size;
      summary.total += summary.mainBundle;
    }

    // Chunks directory
    var chunksDir = Path.join(bundlesDir, 'chunks');
    if (Fs.existsSync(chunksDir)) {
      var chunkFiles = Fs.readdirSync(chunksDir)
        .filter(function (f) {
          return f.endsWith('.js');
        })
        .map(function (f) {
          var size = Fs.statSync(Path.join(chunksDir, f)).size;
          return { name: f, size: size };
        })
        .sort(function (a, b) {
          return b.size - a.size;
        });

      summary.chunkCount = chunkFiles.length;
      summary.chunks = chunkFiles.reduce(function (sum, c) {
        return sum + c.size;
      }, 0);
      summary.total += summary.chunks;
      summary.largestChunks = chunkFiles.slice(0, 5);
    }
  } catch (e) {
    // Ignore errors, summary is optional
  }

  return summary;
}

async function main() {
  var dist = args.dist;
  var outputRoot = args['output-root'] ? Path.resolve(args['output-root']) : repoRoot;
  var profileFocus = args['profile-focus']
    ? args['profile-focus'].split(',').map(function (s) {
        return s.trim();
      })
    : undefined;
  var limitsPath = args.limits ? Path.resolve(args.limits) : undefined;
  var themes = parseThemes(args.themes);
  var bundlesDir = Path.join(outputRoot, 'target/public/bundles');

  log.info('');
  log.info('='.repeat(60));
  log.info('RSPack Profiler' + (statsOnly ? ' (stats only)' : ''));
  log.info('='.repeat(60));
  log.info('');
  log.info('Mode: ' + (dist ? 'production' : 'development'));
  if (statsOnly) log.info('RsDoctor: skipped (stats-only mode)');
  if (args.examples) log.info('Including example plugins');
  if (args['test-plugins']) log.info('Including test plugins');
  log.info('');

  var startTime = Date.now();

  try {
    var result = await runBuild({
      repoRoot: repoRoot,
      outputRoot: outputRoot,
      dist: dist,
      watch: false,
      cache: !args['no-cache'],
      examples: args.examples,
      testPlugins: args['test-plugins'],
      themeTags: themes,
      log: log,
      profile: true,
      profileStatsOnly: statsOnly,
      profileFocus: profileFocus,
      limitsPath: limitsPath,
    });

    var duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (result.success) {
      log.success('Profile build completed in ' + duration + 's');

      // Bundle size summary
      var summary = getBundleSummary(bundlesDir);
      if (summary.total > 0) {
        log.info('');
        log.info('='.repeat(60));
        log.info('Bundle Size Summary');
        log.info('='.repeat(60));
        log.info('');
        log.info('Total size:      ' + formatBytes(summary.total));
        log.info('Main bundle:     ' + formatBytes(summary.mainBundle) + ' (kibana.bundle.js)');
        log.info(
          'Chunks:          ' + formatBytes(summary.chunks) + ' (' + summary.chunkCount + ' files)'
        );
        if (summary.largestChunks.length > 0) {
          log.info('');
          log.info('Largest chunks:');
          summary.largestChunks.forEach(function (chunk) {
            log.info('  ' + formatBytes(chunk.size).padStart(10) + '  ' + chunk.name);
          });
        }
      }

      // Analysis tools
      var statsPath = Path.join(bundlesDir, 'stats.json');
      var rsdoctorManifest = Path.join(bundlesDir, '.rsdoctor/manifest.json');

      log.info('');
      log.info('='.repeat(60));
      log.info('Bundle Analysis Tools');
      log.info('='.repeat(60));
      log.info('');

      // RsDoctor (if not stats-only and manifest exists)
      if (!statsOnly && Fs.existsSync(rsdoctorManifest)) {
        log.info('RsDoctor (interactive):');
        log.info(
          '  → npx @rsdoctor/cli analyze --profile target/public/bundles/.rsdoctor/manifest.json'
        );
        log.info('');
      }

      log.info('Stats file: ' + statsPath);
      log.info('');
      log.info('Analyze with:');
      log.info('  → https://statoscope.tech (drag & drop stats.json)');
      log.info('  → npx webpack-bundle-analyzer target/public/bundles/stats.json');
      log.info('');

      process.exit(0);
    } else {
      log.error(`Profile build failed after ${duration}s`);
      process.exit(1);
    }
  } catch (error) {
    log.error(`Profile build error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
