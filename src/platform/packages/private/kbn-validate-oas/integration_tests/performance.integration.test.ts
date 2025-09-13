/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'node:fs';
import Path from 'node:path';

describe('Performance Integration Tests', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = Fs.mkdtempSync(Path.join(__dirname, 'temp-perf-'));
  });

  afterEach(() => {
    if (Fs.existsSync(testDir)) {
      Fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should handle file operations efficiently', () => {
    const testFile = Path.join(testDir, 'simple-spec.yaml');
    const content = `
openapi: 3.0.0
info:
  title: Simple API
  version: 1.0.0
paths:
  /test:
    get:
      responses:
        '200':
          description: Success
`;

    const startTime = Date.now();

    // Test file operations
    Fs.writeFileSync(testFile, content);
    const readContent = Fs.readFileSync(testFile, 'utf8');
    expect(readContent).toContain('Simple API');

    const endTime = Date.now();

    // File operations should be very fast
    expect(endTime - startTime).toBeLessThan(1000);
  });

  it('should handle multiple file operations within time limits', () => {
    const testFiles = [];

    const startTime = Date.now();

    // Create multiple files
    for (let i = 0; i < 10; i++) {
      const testFile = Path.join(testDir, `spec-${i}.yaml`);
      const content = `
openapi: 3.0.0
info:
  title: Test API ${i}
  version: 1.0.0
paths:
  /test${i}:
    get:
      responses:
        '200':
          description: Success
`;
      Fs.writeFileSync(testFile, content);
      testFiles.push(testFile);
    }

    // Read all files
    for (const file of testFiles) {
      const content = Fs.readFileSync(file, 'utf8');
      expect(content).toContain('openapi: 3.0.0');
    }

    const endTime = Date.now();

    // Multiple file operations should complete quickly
    expect(endTime - startTime).toBeLessThan(2000);
    expect(testFiles).toHaveLength(10);
  });
});
