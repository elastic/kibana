#!/usr/bin/env ts-node
/**
 * Proper TypeScript comment stripper using the TS Compiler API
 * 
 * Usage: npx ts-node strip_comments_clean.ts
 * Or: node --loader ts-node/esm strip_comments_clean.ts
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

const inputFile = path.join(__dirname, 'connector_spec.ts');
const outputFile = path.join(__dirname, 'connector_spec_without_comments.ts');

// Read source file
const sourceText = fs.readFileSync(inputFile, 'utf-8');

// Parse the TypeScript file
const sourceFile = ts.createSourceFile(
  inputFile,
  sourceText,
  ts.ScriptTarget.Latest,
  true
);

// Create a printer without comments
const printer = ts.createPrinter({
  removeComments: true,
  omitTrailingSemicolon: false,
  newLine: ts.NewLineKind.LineFeed,
});

// Print the AST without comments
let result = printer.printFile(sourceFile);

// Add blank lines between top-level declarations for readability
// This preserves structure while removing comment-related blank lines
result = result
  // Add blank line before export interface/type/const (except first line)
  .replace(/\n(export (?:interface|type|const|class|enum|function))/g, '\n\n$1')
  // Add blank line before regular interface/type/class (except first line)  
  .replace(/\n((?:interface|type|class|enum) (?!.*\{.*\}))/g, '\n\n$1')
  // Remove any triple+ blank lines (keep max 2)
  .replace(/\n\n\n+/g, '\n\n')
  // Remove blank line at very start
  .replace(/^\n+/, '');

// Write to output file
fs.writeFileSync(outputFile, result, 'utf-8');

console.log(`✅ Created: ${outputFile}`);
console.log(`Original size: ${sourceText.length} bytes (${sourceText.split('\n').length} lines)`);
console.log(`Without comments: ${result.length} bytes (${result.split('\n').length} lines)`);
console.log(`Reduction: ${((1 - result.length / sourceText.length) * 100).toFixed(1)}%`);

