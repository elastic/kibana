#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Kibana Package Dependency Tree
 *
 * CLI dependency tree visualization using tsconfig.json files with kbn_references.
 *
 * Usage:
 *   node scripts/kbn_dependency_tree <tsconfig.json> [options]
 *
 * Examples:
 *   node scripts/kbn_dependency_tree x-pack/platform/plugins/shared/ml/tsconfig.json
 *   node scripts/kbn_dependency_tree x-pack/platform/plugins/shared/ml/tsconfig.json --depth 2
 *   node scripts/kbn_dependency_tree x-pack/platform/plugins/shared/ml/tsconfig.json --filter "@kbn/ml-"
 *
 * Options:
 *   --depth <n>     Maximum depth to traverse (default: 3)
 *   --paths         Show package paths in parentheses
 *   --filter <pattern>  Show only dependencies matching pattern (e.g., "@kbn/ml-", "core")
 *   --json          Output as JSON
 */

var fs = require('fs');
var path = require('path');
var parseJsonc = require('@kbn/repo-packages/utils/jsonc').parse;

// Constants
var TREE_CHARS = {
  branch: '├─ ',
  last: '└─ ',
  pipe: '│  ',
  space: '   ',
};

var DEFAULT_MAX_DEPTH = 3;
var ROOT_PACKAGE_JSON_PATH = 'package.json';

// Global state
var state = {
  packageMap: null,
  reversePackageMap: null,
};

/**
 * Loads and caches the package map from the root package.json dependencies
 * @returns {Map<string, string>} Map of package names to their paths
 */
function loadPackageMap() {
  if (state.packageMap) return state.packageMap;

  try {
    var packageJsonContent = fs.readFileSync(ROOT_PACKAGE_JSON_PATH, 'utf8');
    var packageJson = JSON.parse(packageJsonContent);

    state.packageMap = new Map();
    state.reversePackageMap = new Map();

    // Parse dependencies for @kbn packages with "link:" prefix
    if (packageJson.dependencies) {
      Object.entries(packageJson.dependencies).forEach(function ([packageName, packageSpec]) {
        if (packageName.startsWith('@kbn/') && packageSpec.startsWith('link:')) {
          var packagePath = packageSpec.replace('link:', '');
          state.packageMap.set(packageName, packagePath);
          state.reversePackageMap.set(packagePath, packageName);
        }
      });
    }

    return state.packageMap;
  } catch (error) {
    console.error('Failed to load package map from root package.json:', error.message);
    return new Map();
  }
}

/**
 * Extracts kbn_references from a tsconfig.json file
 * @param {string} tsconfigPath - Path to the tsconfig.json file
 * @returns {string[]} Array of @kbn package references
 */
function readTsconfigReferences(tsconfigPath) {
  try {
    if (!fs.existsSync(tsconfigPath)) {
      console.warn(`Warning: File does not exist at ${tsconfigPath}`);
      return [];
    }

    var tsconfigContent = fs.readFileSync(tsconfigPath, 'utf8');
    var tsconfig = parseJsonc(tsconfigContent);

    if (!tsconfig.kbn_references || !Array.isArray(tsconfig.kbn_references)) {
      return [];
    }

    return tsconfig.kbn_references.filter(function (ref) {
      // Handle string references
      if (typeof ref === 'string') {
        return ref.startsWith('@kbn/');
      }
      // Skip object references (like { "path": "..." })
      return false;
    });
  } catch (error) {
    console.warn(`Warning: Could not read tsconfig at ${tsconfigPath}: ${error.message}`);
    return [];
  }
}

/**
 * Gets the file path for a given package name
 * @param {string} packageName - The @kbn package name
 * @returns {string|null} The package path or null if not found
 */
function getPackagePath(packageName) {
  var pkgMap = loadPackageMap();
  return pkgMap.get(packageName) || null;
}

/**
 * Gets the package name for a given package path using reverse lookup
 * @param {string} packagePath - The path to the package directory
 * @returns {string|null} The package name or null if not found
 */
function getPackageNameFromPath(packagePath) {
  loadPackageMap(); // Ensure maps are loaded
  return state.reversePackageMap.get(packagePath) || null;
}

/**
 * Finds the tsconfig.json file for a given package path
 * @param {string} packagePath - The path to the package directory
 * @returns {string|null} The path to tsconfig.json or null if not found
 */
function findTsconfigForPackage(packagePath) {
  var tsconfigPath = path.join(packagePath, 'tsconfig.json');
  return fs.existsSync(tsconfigPath) ? tsconfigPath : null;
}

/**
 * Gets the package name from a tsconfig.json path using reverse lookup
 * @param {string} tsconfigPath - Path to the tsconfig.json file
 * @returns {string} The package name, or a fallback based on directory name
 */
function getPackageNameFromTsconfig(tsconfigPath) {
  var packagePath = path.dirname(tsconfigPath);

  // First try exact path lookup
  var packageName = getPackageNameFromPath(packagePath);
  if (packageName) {
    return packageName;
  } else {
    throw new Error(`Package name not found for tsconfig at ${tsconfigPath}`);
  }
}

/**
 * Builds a dependency tree from a tsconfig.json file
 * @param {string} tsconfigPath - Path to the root tsconfig.json
 * @param {Object} options - Configuration options
 * @returns {Object|null} The dependency tree
 */
function buildDependencyTree(tsconfigPath, options) {
  options = options || {};
  var maxDepth = options.maxDepth || DEFAULT_MAX_DEPTH;
  var filter = options.filter || null;
  var nodeCache = new Map(); // Cache complete dependency nodes
  var processing = new Set();

  function traverse(currentTsconfigPath, depth, currentPath) {
    currentPath = currentPath || [];
    if (depth > maxDepth) return null;

    var packageName = getPackageNameFromTsconfig(currentTsconfigPath);

    if (processing.has(packageName)) {
      return { id: packageName, circular: true };
    }

    // Return cached node if already processed
    if (nodeCache.has(packageName)) {
      return nodeCache.get(packageName);
    }

    if (currentPath.includes(packageName)) {
      return { id: packageName, circular: true };
    }

    processing.add(packageName);
    var references = readTsconfigReferences(currentTsconfigPath);
    var filteredRefs = applyFilters(references, filter);

    var node = createDependencyNode(packageName, currentTsconfigPath);

    for (var i = 0; i < filteredRefs.length; i++) {
      var refPackageName = filteredRefs[i];
      var dependency = processDependency(
        refPackageName,
        depth,
        currentPath,
        packageName,
        maxDepth,
        traverse
      );
      if (dependency) {
        node.dependencies.push(dependency);
      }
    }

    processing.delete(packageName);
    nodeCache.set(packageName, node); // Cache the complete node
    return node;
  }

  return traverse(tsconfigPath, 0);
}

/**
 * Applies filters to the list of references
 * @param {string[]} references - The original references
 * @param {string|null} filter - Filter pattern to match package names
 * @returns {string[]} Filtered references
 */
function applyFilters(references, filter) {
  if (!filter) {
    return references;
  }

  return references.filter(function (ref) {
    return ref.includes(filter);
  });
}

/**
 * Creates a dependency node structure
 * @param {string} packageName - The package name
 * @param {string} tsconfigPath - Path to tsconfig
 * @returns {Object} Dependency node
 */
function createDependencyNode(packageName, tsconfigPath) {
  return {
    id: packageName,
    tsconfigPath: tsconfigPath,
    packagePath: path.dirname(tsconfigPath),
    dependencies: [],
  };
}

/**
 * Processes a single dependency reference
 * @param {string} refPackageName - The dependency package name
 * @param {number} depth - Current traversal depth
 * @param {string[]} currentPath - Current path to detect cycles
 * @param {string} packageName - Current package name
 * @param {number} maxDepth - Maximum traversal depth
 * @param {Function} traverse - Recursive traversal function
 * @returns {Object|null} Processed dependency node
 */
function processDependency(refPackageName, depth, currentPath, packageName, maxDepth, traverse) {
  if (currentPath.includes(refPackageName)) {
    return { id: refPackageName, circular: true };
  }

  var refPackagePath = getPackagePath(refPackageName);
  if (!refPackagePath) {
    return { id: refPackageName, external: true };
  }

  var refTsconfigPath = findTsconfigForPackage(refPackagePath);
  if (!refTsconfigPath) {
    return { id: refPackageName, packagePath: refPackagePath, noTsconfig: true };
  }

  if (depth < maxDepth) {
    var newPath = currentPath.slice();
    newPath.push(packageName);
    var childNode = traverse(refTsconfigPath, depth + 1, newPath);
    if (childNode) {
      return childNode;
    }
  }

  return {
    id: refPackageName,
    packagePath: refPackagePath,
    tsconfigPath: refTsconfigPath,
  };
}

function printTree(node, prefix, isLast, showPaths) {
  prefix = prefix || '';
  isLast = isLast !== false;
  showPaths = showPaths || false;
  if (!node) return;

  var connector = isLast ? TREE_CHARS.last : TREE_CHARS.branch;
  var info = '';

  if (showPaths && !node.circular && !node.external) {
    if (node.packagePath) {
      info = ' (' + node.packagePath + ')';
    } else if (node.tsconfigPath) {
      info = ' (' + path.dirname(node.tsconfigPath) + ')';
    }
  }

  var label = node.id;
  if (node.circular) {
    label += ' [CIRCULAR]';
  } else if (node.external) {
    label += ' [EXTERNAL]';
  } else if (node.noTsconfig) {
    label += ' [NO-TSCONFIG]';
  }

  console.log(prefix + connector + label + info);

  if (node.dependencies && node.dependencies.length > 0) {
    var newPrefix = prefix + (isLast ? TREE_CHARS.space : TREE_CHARS.pipe);

    for (var i = 0; i < node.dependencies.length; i++) {
      var child = node.dependencies[i];
      var isLastChild = i === node.dependencies.length - 1;
      printTree(child, newPrefix, isLastChild, showPaths);
    }
  }
}

function printJson(tree) {
  console.log(JSON.stringify(tree, null, 2));
}

/**
 * Prints usage information and exits
 */
function printUsage() {
  console.log('Usage: node scripts/kbn_dependency_tree <tsconfig.json> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --depth <n>     Maximum depth to traverse (default: ' + DEFAULT_MAX_DEPTH + ')');
  console.log('  --paths         Show package paths in parentheses');
  console.log('  --filter <pattern>  Show only dependencies matching pattern');
  console.log('  --json          Output as JSON');
  console.log('  --help          Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/kbn_dependency_tree x-pack/platform/plugins/shared/ml/tsconfig.json');
  console.log(
    '  node scripts/kbn_dependency_tree x-pack/platform/plugins/shared/ml/tsconfig.json --depth 2'
  );
  console.log(
    '  node scripts/kbn_dependency_tree x-pack/platform/plugins/shared/ml/tsconfig.json --filter "@kbn/ml-"'
  );
  process.exit(0);
}

/**
 * Parses command line arguments into structured options
 * @param {string[]} args - Command line arguments
 * @returns {Object} Parsed options
 */
function parseArgs(args) {
  var flags = args.filter(function (arg) {
    return arg.startsWith('--');
  });
  var params = args.filter(function (arg) {
    return !arg.startsWith('--');
  });

  if (params.length < 1 || args.includes('--help')) {
    printUsage();
  }

  function getArgValue(flag) {
    var index = args.indexOf(flag);
    return index >= 0 && args[index + 1] ? args[index + 1] : null;
  }

  return {
    tsconfigPath: params[0],
    maxDepth: parseInt(getArgValue('--depth')) || DEFAULT_MAX_DEPTH,
    filterPattern: getArgValue('--filter'),
    showPaths: flags.includes('--paths'),
    jsonOutput: flags.includes('--json'),
  };
}

/**
 * Prints header information for non-JSON output
 * @param {string} tsconfigPath - Path to tsconfig
 * @param {string|null} filterPattern - Filter pattern
 */
function printHeader(tsconfigPath, filterPattern) {
  console.log('@kbn dependency tree for ' + tsconfigPath);
  if (filterPattern) {
    console.log('(filtered to packages containing: "' + filterPattern + '")');
  }
  console.log('');
}

/**
 * Prints legend information
 * @param {string|null} filterPattern - Filter pattern
 */
function printLegend(filterPattern) {
  console.log('');
  console.log('Legend:');
  console.log('  [EXTERNAL]     - Package not found in root package.json dependencies');
  console.log('  [CIRCULAR]     - Circular dependency detected');
  console.log('  [NO-TSCONFIG]  - Package found but no tsconfig.json');

  if (filterPattern) {
    console.log('  Filtered to packages containing: "' + filterPattern + '"');
  }
}

function main() {
  var args = process.argv.slice(2);
  var options = parseArgs(args);
  var tsconfigPath = options.tsconfigPath;
  var maxDepth = options.maxDepth;
  var filterPattern = options.filterPattern;
  var showPaths = options.showPaths;
  var jsonOutput = options.jsonOutput;

  if (!fs.existsSync(tsconfigPath)) {
    console.error('Error: tsconfig.json file "' + tsconfigPath + '" does not exist');
    process.exit(1);
  }

  if (!jsonOutput) {
    printHeader(tsconfigPath, filterPattern);
  }

  var treeOptions = {
    maxDepth: maxDepth,
    filter: filterPattern,
  };

  var tree = buildDependencyTree(tsconfigPath, treeOptions);

  if (jsonOutput) {
    printJson(tree);
  } else {
    if (tree) {
      printTree(tree, '', true, showPaths);
    } else {
      console.log('No dependencies found or unable to build dependency tree.');
    }
    printLegend(filterPattern);
  }
}

if (require.main === module) {
  main();
}
