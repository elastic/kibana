/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface MinimalLog {
  info: (msg: string) => void;
  write: (chunk: string) => void;
}

interface EslintJsonMessage {
  ruleId?: string;
  message?: string;
}

interface EslintJsonFile {
  filePath: string;
  messages: EslintJsonMessage[];
}

interface EslintRunResult {
  name: string;
  directory: string;
  report: EslintJsonFile[];
  exitCode: number;
  stderr?: string;
}

export default function (log: MinimalLog, results: EslintRunResult[]): void {
  // Build summary: for each package name, count messages by message text
  const summary = new Map<string, Map<string, number>>();

  for (const r of results) {
    if (!r || !Array.isArray(r.report)) continue;

    let pkgMap = summary.get(r.name);

    if (!pkgMap) {
      pkgMap = new Map();

      summary.set(r.name, pkgMap);
    }

    for (const file of r.report) {
      const msgs = Array.isArray(file?.messages) ? file.messages : [];

      for (const m of msgs) {
        const key = m && typeof m.message === 'string' ? m.message : String(m?.ruleId || 'unknown');
        pkgMap.set(key, (pkgMap.get(key) || 0) + 1);
      }
    }
  }

  for (const [name, counts] of summary) {
    if (!counts || counts.size === 0) continue;

    log.info(name);

    const sorted = Array.from(counts.entries()).sort((a, b) => {
      const sa = parseScore(a[0]);

      const sb = parseScore(b[0]);

      if (sb !== sa) return sb - sa; // higher score first

      if (b[1] !== a[1]) return b[1] - a[1]; // then higher count

      return a[0].localeCompare(b[0]); // then message text
    });

    for (const [msg, count] of sorted) {
      log.info(`[${count}] ${msg}`);
    }
    log.write('\n');
  }
}

function parseScore(msg: string): number {
  const m = msg.match(/score=(\d+)/);

  return m ? parseInt(m[1], 10) : 0;
}
