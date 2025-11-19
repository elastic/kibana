/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

/**
 * Clones or updates the elastic/integrations repository
 */
async function cloneOrUpdateRepo() {
  const repoDir = 'integrations';
  const repoUrl = 'https://github.com/elastic/integrations.git';

  try {
    // Check if the directory already exists
    await fs.access(repoDir);
    console.log(`Directory ${repoDir} already exists, skipping clone...`);
  } catch (error) {
    // Directory doesn't exist, clone it
    console.log('Cloning elastic/integrations repository (shallow clone)...');
    try {
      execSync(`git clone --depth=1 ${repoUrl}`, { stdio: 'inherit' });
      console.log('Repository cloned successfully.\n');
    } catch (cloneError) {
      console.error(`Error cloning repository: ${cloneError.message}`);
      process.exit(1);
    }
  }
}

/**
 * Recursively walks through a directory and returns all file paths
 */
async function* walkDir(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      yield* walkDir(fullPath);
    } else {
      yield fullPath;
    }
  }
}

/**
 * Processes a dashboard JSON file and extracts lens metric visualizations
 */
async function processDashboardFile(filePath, packageName) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const dashboard = JSON.parse(data);

    if (!dashboard.attributes || !dashboard.attributes.panelsJSON) {
      return [];
    }

    // Parse panelsJSON - it could be either an array or a JSON string
    let panels;
    const panelsJSON = dashboard.attributes.panelsJSON;

    if (Array.isArray(panelsJSON)) {
      panels = panelsJSON;
    } else if (typeof panelsJSON === 'string') {
      panels = JSON.parse(panelsJSON);
    } else {
      return [];
    }

    const results = [];

    // Iterate through panels
    for (const panel of panels) {
      // Check if embeddableConfig.attributes exists and matches criteria
      if (panel.embeddableConfig?.attributes) {
        const attrs = panel.embeddableConfig.attributes;

        // Check if type is "lens"
        if (attrs.type === 'lens') {
          results.push({
            package_name: packageName,
            dashboard_file: path.basename(filePath),
            panel_title: panel.title || '',
            attributes: attrs,
          });
        }
      }
    }

    return results;
  } catch (error) {
    console.warn(`Warning: Error processing ${filePath}: ${error.message}`);
    return [];
  }
}

/**
 * Main function
 */
async function main() {
  // Clone or update the repository first
  await cloneOrUpdateRepo();

  const packagesDir = 'integrations/packages';

  // Check if the directory exists
  try {
    await fs.access(packagesDir);
  } catch (error) {
    console.error(`Error: Directory ${packagesDir} does not exist`);
    process.exit(1);
  }

  const results = [];

  // Walk through all files
  try {
    for await (const filePath of walkDir(packagesDir)) {
      // Skip if not a JSON file
      if (!filePath.endsWith('.json')) {
        continue;
      }

      // Check if this is in a kibana/dashboard subdirectory
      if (!filePath.includes('/kibana/dashboard/')) {
        continue;
      }

      // Extract package name (first directory after packages/)
      const parts = filePath.split(path.sep);
      const packagesIndex = parts.indexOf('packages');
      const packageName =
        packagesIndex !== -1 && packagesIndex + 1 < parts.length ? parts[packagesIndex + 1] : '';

      // Process the JSON file
      const found = await processDashboardFile(filePath, packageName);
      results.push(...found);
    }
  } catch (error) {
    console.error(`Error walking directory: ${error.message}`);
    process.exit(1);
  }

  // Write results to file
  const outputFile = 'lens_panels.json';

  try {
    const output = JSON.stringify(results, null, 2);
    await fs.writeFile(outputFile, output, 'utf8');
    console.log(
      `Successfully extracted ${results.length} lens metric visualizations to ${outputFile}`
    );
  } catch (error) {
    console.error(`Error writing to file: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});
