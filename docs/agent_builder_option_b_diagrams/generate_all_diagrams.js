#!/usr/bin/env node
/*
 * Generates all Option B Excalidraw diagrams from MCP checkpoint element data.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dir = __dirname;
const converter = path.join(dir, 'convert_mcp_to_excalidraw.js');

const diagrams = [
  {
    name: '01_conversation_es_document',
    checkpoint: '3c13861049df4b27bf',
  },
  {
    name: '02_server_components',
    checkpoint: '698275e36ded44d590',
  },
  {
    name: '03_client_components',
    checkpoint: 'b2b6d874ca8c48fa9a',
  },
  {
    name: '04_collaborative_message_flow',
    checkpoint: '3fcb573d2e93433bbc',
  },
  {
    name: '05_missing_by_phase',
    checkpoint: 'eafa6e5f461b478aae',
  },
];

for (const diagram of diagrams) {
  const inputPath = path.join(dir, `${diagram.name}.checkpoint.json`);
  const outputPath = path.join(dir, `${diagram.name}.excalidraw`);

  if (!fs.existsSync(inputPath)) {
    console.warn(`Skipping ${diagram.name}: missing ${inputPath}`);
    continue;
  }

  execSync(`node "${converter}" "${inputPath}" "${outputPath}"`, { stdio: 'inherit' });
}

console.log('Done.');
