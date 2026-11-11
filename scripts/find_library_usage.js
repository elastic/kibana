#!/usr/bin/env node

/**
 * This script finds files in the codebase that are using a specific npm library.
 * It scans JavaScript, TypeScript, and JSON files for import/require statements or dependencies.
 *
 * Usage: node find_library_usage.js <library-name> [--verbose] [--dir=<directory>]
 *
 * Examples:
 *   node find_library_usage.js lodash
 *   node find_library_usage.js react --verbose
 *   node find_library_usage.js moment --dir=./src
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
const libraryName = args[0];
const options = args.slice(1).reduce(
  (acc, arg) => {
    if (arg === '--verbose') {
      acc.verbose = true;
    } else if (arg.startsWith('--dir=')) {
      acc.directory = arg.substring(6);
    }
    return acc;
  },
  {
    verbose: false,
    directory: '.',
  }
);

// Validate required parameters
if (!libraryName) {
  console.error('Error: Library name is required');
  console.error('Usage: node find_library_usage.js <library-name> [--verbose] [--dir=<directory>]');
  process.exit(1);
}

// Escape special characters for use in grep
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const escapedLibrary = escapeRegExp(libraryName);

/**
 * Find files containing the library references
 * @param {string} library - The library name to search for
 * @param {object} opts - Search options
 * @returns {Array} - List of files and matches
 */
function findLibraryUsage(library, opts) {
  const { verbose, directory } = opts;
  const escapedLib = escapeRegExp(library);

  console.log(`Searching for usages of "${library}" in ${path.resolve(directory)}...`);

  try {
    // First find all JS/TS/JSON files using find command (macOS compatible)
    // The -type f ensures we're only looking at files (not directories)
    // Already searches recursively through all subdirectories
    const findCommand = `find ${directory} -type f \\( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" -o -name "*.json" \\) -not -path "*/node_modules/*" -not -path "*/dist/*"`;

    // Using simple grep patterns that work on macOS
    const grepPatterns = [
      `grep -l "import.*['\\"]${escapedLib}['\\"]" 2>/dev/null`,
      `grep -l "require(['\\"]${escapedLib}['\\"])" 2>/dev/null`,
      `grep -l "['\\\"]${escapedLib}['\\\"]\\s*:" 2>/dev/null`,
    ];

    let files = new Set();

    // Execute each grep search and collect results
    console.log('Searching files...');

    for (const grepPattern of grepPatterns) {
      try {
        // Use -print0 with find and -0 with xargs to handle files with spaces properly
        const cmd = `${findCommand} -print0 | xargs -0 ${grepPattern}`;
        const output = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }).trim();

        if (output) {
          output.split('\n').forEach((file) => {
            if (file.trim()) files.add(file.trim());
          });
        }
      } catch (e) {
        // Ignore grep errors when no matches are found
        if (e.status !== 1) {
          console.error(`Error in search: ${e.message}`);
        }
      }
    }

    const filesList = Array.from(files);

    // Output results
    if (filesList.length > 0) {
      console.log('\nFiles using the library:');

      if (verbose) {
        // Show matching content for each file
        filesList.forEach((filePath) => {
          console.log(`\n### ${filePath} ###`);
          try {
            const grepContentCmd = `grep -n ".*${escapedLib}.*" "${filePath}" 2>/dev/null`;
            const content = execSync(grepContentCmd, { encoding: 'utf8' });
            console.log(content.trim());
          } catch (e) {
            console.log('(Error showing content)');
          }
        });
      } else {
        // Just list the files
        filesList.forEach((file) => console.log(file));
      }

      console.log(`\nFound ${filesList.length} files using "${library}"\n`);
    } else {
      console.log(`No files found using "${library}".`);
    }

    // Check package.json for dependency
    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

      const deps = {
        ...packageData.dependencies,
        ...packageData.devDependencies,
        ...packageData.peerDependencies,
        ...packageData.optionalDependencies,
      };

      if (deps && deps[library]) {
        console.log(
          `Library "${library}" is listed in package.json as a dependency: ${deps[library]}`
        );
      } else {
        console.log(
          `Note: Library "${library}" is not listed in package.json as a direct dependency.`
        );
      }
    } catch (err) {
      console.log('Could not check package.json for dependencies.');
    }
  } catch (error) {
    console.error('Error executing search:', error.message);
  }
}

// Execute the search
findLibraryUsage(libraryName, options);
