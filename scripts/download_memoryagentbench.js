#!/usr/bin/env node

/*
 * Downloads the MemoryAgentBench dataset from HuggingFace datasets-server API
 * and saves it as JSON to tmp/memory_agent_bench.json
 *
 * Usage:
 *   node scripts/download_memoryagentbench.js [--output <file>]
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DATASET = 'ai-hyz/MemoryAgentBench';
const CONFIG = 'default';
const SPLITS = ['Accurate_Retrieval', 'Test_Time_Learning', 'Long_Range_Understanding', 'Conflict_Resolution'];
const PAGE_SIZE = 100;

const args = process.argv.slice(2);
const outputIdx = args.indexOf('--output');
const OUTPUT_FILE = outputIdx !== -1 ? args[outputIdx + 1] : path.join(__dirname, '..', 'tmp', 'memory_agent_bench.json');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'node' } }, (res) => {
      if (res.statusCode >= 300 && res.headers.location) {
        return fetchJson(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode >= 400) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

async function fetchSplit(split) {
  const rows = [];
  let offset = 0;

  while (true) {
    const url = `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(DATASET)}&config=${CONFIG}&split=${encodeURIComponent(split)}&offset=${offset}&limit=${PAGE_SIZE}`;
    process.stdout.write(`  Fetching ${split} offset=${offset}...`);

    const result = await fetchJson(url);
    const batch = result.rows ?? [];
    rows.push(...batch.map((r) => r.row));

    console.log(` got ${batch.length} rows (total: ${rows.length})`);

    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

async function main() {
  console.log(`Downloading MemoryAgentBench from HuggingFace...\n`);

  const outDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const result = {};

  for (const split of SPLITS) {
    console.log(`\n[${split}]`);
    result[split] = await fetchSplit(split);
    console.log(`  => ${result[split].length} examples`);
  }

  const total = Object.values(result).reduce((s, v) => s + v.length, 0);
  console.log(`\nTotal: ${total} examples across ${SPLITS.length} splits`);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  console.log(`\nSaved to: ${OUTPUT_FILE}`);

  // Print a brief summary of structure
  const firstSplit = SPLITS[0];
  if (result[firstSplit]?.length > 0) {
    console.log(`\nSample keys from ${firstSplit}[0]:`, Object.keys(result[firstSplit][0]));
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
