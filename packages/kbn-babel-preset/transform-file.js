#!/usr/bin/env node
/*
 * Simple CLI to transform a file using @kbn/babel-preset's node preset
 * and print the transformed output to stdout.
 */

const path = require('path');
const fs = require('fs');
const babel = require('@babel/core');

function usageAndExit(code = 1) {
  const script = path.basename(process.argv[1] || 'transform-file.js');
  console.error(`Usage: ${script} <path-to-file> [--show-maps]\n\n` +
    `Transforms the given file with the @kbn/babel-preset node preset and prints the code to stdout.\n` +
    `Set KBN_DEBUG_INLINE_REWRITE to a comma-separated list of substrings to also print files\n` +
    `that match during plugin execution.`);
  process.exit(code);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
    usageAndExit(0);
  }

  const showMaps = args.includes('--show-maps');
  const fileArg = args.find((a) => !a.startsWith('-'));
  if (!fileArg) usageAndExit(1);

  const filePath = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(2);
  }

  try {
    const result = await babel.transformFileAsync(filePath, {
      // Use the node preset from this package
      presets: [require.resolve('./node_preset')],
      // Ensure filename is set so plugins can use it for debugging
      filename: filePath,
      sourceMaps: showMaps ? 'inline' : false,
      babelrc: false,
      configFile: false,
      // Keep lines stable for easier diffing
      retainLines: true,
      compact: false,
      comments: true,
    });

    if (!result || typeof result.code !== 'string') {
      console.error('No result from Babel transform.');
      process.exit(3);
    }

    process.stdout.write(result.code + (result.code.endsWith('\n') ? '' : '\n'));
  } catch (err) {
    console.error(err && err.stack ? err.stack : String(err));
    process.exit(4);
  }
}

main();
