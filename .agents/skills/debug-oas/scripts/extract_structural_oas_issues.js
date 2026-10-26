#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('@kbn/setup-node-env');

var Fs = require('node:fs');
var Path = require('node:path');

var DOC_MESSAGE_PATTERNS = [
  /required property 'example'/,
  /required property 'examples'/,
  /required property 'description'/,
  /required property 'summary'/,
];

main();

function main() {
  var args = parseArgs(process.argv.slice(2));

  readInput(args.inputPath)
    .then(function (input) {
      var parsedIssues = parseIssues(input);
      var filteredIssues = parsedIssues.filter(function (issue) {
        return args.includeDocs || !isDocumentationIssue(issue.message);
      });
      var groupedIssues = groupByMessage(filteredIssues);

      printSummary({
        inputPath: args.inputPath,
        parsedIssues: parsedIssues,
        filteredIssues: filteredIssues,
        groupedIssues: groupedIssues,
        json: args.json,
      });
    })
    .catch(function (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}

function parseArgs(argv) {
  var parsed = {
    includeDocs: false,
    inputPath: null,
    json: false,
  };
  var index;

  for (index = 0; index < argv.length; index += 1) {
    var arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    if (arg === '--include-docs') {
      parsed.includeDocs = true;
      continue;
    }

    if (arg === '--json') {
      parsed.json = true;
      continue;
    }

    if (arg.startsWith('-')) {
      printHelp('Unknown argument "' + arg + '"');
      process.exit(1);
    }

    if (parsed.inputPath !== null) {
      printHelp('Only one input path may be provided.');
      process.exit(1);
    }

    parsed.inputPath = arg;
  }

  return parsed;
}

function printHelp(errorMessage) {
  if (errorMessage) {
    console.error(errorMessage);
    console.error('');
  }

  console.log(`Extract structural OAS issues from validate_oas_docs output.

Usage:
  node .agents/skills/debug-oas/scripts/extract_structural_oas_issues.js [validate-output.txt]
  node scripts/validate_oas_docs.js --only traditional 2>&1 | node .agents/skills/debug-oas/scripts/extract_structural_oas_issues.js

Options:
  --include-docs   Keep example/description/summary issues in the output.
  --json           Print machine-readable JSON.
`);
}

function readInput(inputPath) {
  if (inputPath) {
    return Promise.resolve(Fs.readFileSync(Path.resolve(inputPath), 'utf8'));
  }

  if (process.stdin.isTTY) {
    printHelp('Provide a path to saved CLI output or pipe input on stdin.');
    process.exit(1);
  }

  return new Promise(function (resolve, reject) {
    var chunks = [];

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', function (chunk) {
      chunks.push(chunk);
    });
    process.stdin.on('end', function () {
      resolve(chunks.join(''));
    });
    process.stdin.on('error', reject);
  });
}

function parseIssues(input) {
  var issues = [];
  var lines = stripAnsi(input).split(/\r?\n/);
  var currentPath = null;
  var currentMessage = null;
  var currentSchemaPath = null;
  var index;

  function flushIssue() {
    if (!currentPath || !currentMessage) {
      currentPath = null;
      currentMessage = null;
      currentSchemaPath = null;
      return;
    }

    issues.push({
      path: currentPath,
      message: currentMessage,
      schemaPath: currentSchemaPath,
    });

    currentPath = null;
    currentMessage = null;
    currentSchemaPath = null;
  }

  for (index = 0; index < lines.length; index += 1) {
    var content = normalizeIssueLine(lines[index]);

    if (!content) {
      flushIssue();
      continue;
    }

    if (content.startsWith('/')) {
      flushIssue();
      currentPath = content;
      continue;
    }

    if (!currentPath) {
      continue;
    }

    if (content.startsWith('Failed check @ schema path:')) {
      currentSchemaPath = content.slice('Failed check @ schema path:'.length).trim();
      flushIssue();
      continue;
    }

    if (currentMessage === null) {
      currentMessage = content;
      continue;
    }
  }

  flushIssue();

  return issues;
}

function normalizeIssueLine(line) {
  var match = line.match(/^\s*│\s*(.*)$/);
  var content = match ? match[1] : line;

  return content.trim();
}

function stripAnsi(value) {
  return value.replace(/\u001B\[[0-9;]*m/g, '');
}

function isDocumentationIssue(message) {
  return DOC_MESSAGE_PATTERNS.some(function (pattern) {
    return pattern.test(message);
  });
}

function groupByMessage(issues) {
  var groups = {};
  var sortedEntries;
  var index;

  for (index = 0; index < issues.length; index += 1) {
    var issue = issues[index];
    if (!groups[issue.message]) {
      groups[issue.message] = [];
    }
    groups[issue.message].push(issue);
  }

  sortedEntries = Object.entries(groups).sort(function (left, right) {
    if (right[1].length !== left[1].length) {
      return right[1].length - left[1].length;
    }

    return left[0].localeCompare(right[0]);
  });

  return sortedEntries;
}

function printSummary(options) {
  var result = {
    inputPath: options.inputPath || '(stdin)',
    parsedIssueCount: options.parsedIssues.length,
    structuralIssueCount: options.filteredIssues.length,
    uniqueStructuralMessages: options.groupedIssues.length,
    issuesByMessage: options.groupedIssues.map(function (entry) {
      return {
        message: entry[0],
        count: entry[1].length,
        paths: entry[1].map(function (issue) {
          return issue.path;
        }),
      };
    }),
  };

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log('Input: ' + result.inputPath);
  console.log('Parsed issues: ' + result.parsedIssueCount);
  console.log('Structural issues: ' + result.structuralIssueCount);
  console.log('Unique structural messages: ' + result.uniqueStructuralMessages);

  if (result.structuralIssueCount === 0) {
    console.log('');
    console.log('No structural issues found.');
    return;
  }

  console.log('');
  result.issuesByMessage.forEach(function (entry) {
    console.log(entry.count + 'x ' + entry.message);
    entry.paths.forEach(function (issuePath) {
      console.log('  - ' + issuePath);
    });
    console.log('');
  });
}
