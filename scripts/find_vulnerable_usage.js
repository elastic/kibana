#!/usr/bin/env node

/**
 * This script identifies files using vulnerable functions from a Snyk vulnerability
 *
 * Usage: node find_vulnerable_usage.js --vuln=SNYK-ID [--path=/path/to/scan] [--output=file.json]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.substring(2).split('=');
    acc[key] = value || true;
  }
  return acc;
}, {});

// Configuration
const config = {
  vulnId: args.vuln || args.id,
  outputFile: args.output,
  scanPath: args.path || '.', // Default to current directory if no path specified
  tempDir: path.join(process.cwd(), '.tmp_vulnerability_scan'),
};

// Validate required parameters
if (!config.vulnId) {
  console.error('Error: Vulnerability ID is required. Use --vuln=SNYK-ID');
  process.exit(1);
}

// Ensure temp directory exists
if (!fs.existsSync(config.tempDir)) {
  fs.mkdirSync(config.tempDir, { recursive: true });
}

/**
 * Get vulnerability information from Snyk
 * @param {string} vulnId - Snyk vulnerability ID
 * @returns {Object} - Vulnerability data
 */
function getVulnerabilityInfo(vulnId) {
  console.log(`Fetching vulnerability information for ${vulnId}...`);

  try {
    // Call the fetch_snyk_vuln.js script with JSON output format
    const vulnDataPath = path.join(config.tempDir, `${vulnId}.json`);
    execSync(
      `node ${path.join(
        __dirname,
        'fetch_snyk_vuln.js'
      )} --vuln=${vulnId} --output=json --file=${vulnDataPath}`,
      { stdio: 'inherit' }
    );

    // Read and parse the vulnerability data
    const vulnData = JSON.parse(fs.readFileSync(vulnDataPath, 'utf8'));
    console.info(vulnData);
    return vulnData;
  } catch (error) {
    console.error('Failed to fetch vulnerability information:', error.message);
    process.exit(1);
  }
}

/**
 * Find files using the vulnerable package
 * @param {string} packageName - Name of the vulnerable package
 * @returns {Array<string>} - List of file paths
 */
function findFilesUsingPackage(packageName) {
  console.log(`Finding files that use the package '${packageName}'...`);

  try {
    // Call the dependency_usage.sh script to find files using the package
    const dependencyDataPath = path.join(config.tempDir, `${packageName}_usage.json`);

    // Build command with path parameter if specified
    let command = `${path.join(
      __dirname,
      'dependency_usage.sh'
    )} --dependency-name=${packageName} --output-path=${dependencyDataPath}`;

    // Add paths parameter if specified
    if (config.scanPath) {
      command += ` --paths=${config.scanPath}`;
    }

    execSync(command, { stdio: 'inherit' });

    // Read and parse the dependency usage data
    const dependencyData = JSON.parse(fs.readFileSync(dependencyDataPath, 'utf8'));

    // Extract file paths from the dependency usage result
    // This structure might need adjustment based on actual dependency_usage.sh output format
    const filePaths = [];

    // Process each package entry (assuming dependency_usage.sh outputs an array of packages)
    if (Array.isArray(dependencyData)) {
      dependencyData.forEach((entry) => {
        if (entry.sources) {
          entry.sources.forEach((source) => {
            if (source.path) {
              filePaths.push(source.path);
            }
          });
        }
      });
    }

    return filePaths;
  } catch (error) {
    console.error(`Failed to find files using package '${packageName}':`, error.message);
    return [];
  }
}

/**
 * Search for vulnerable function usage in files
 * @param {Array<string>} filePaths - List of file paths to search
 * @param {Array<string>} vulnerableFunctions - List of vulnerable function names
 * @returns {Object} - Object mapping files to vulnerable functions found
 */
function findVulnerableFunctionUsage(filePaths, vulnerableFunctions) {
  console.log('Scanning files for vulnerable function usage...');

  const results = {};

  // Create regular expressions for each vulnerable function
  const functionRegexes = vulnerableFunctions.map((func) => ({
    name: func,
    // Match function calls, method calls, and property access
    regex: new RegExp(
      `(?:\\b${func}\\b\\s*\\(|\\b\\.${func}\\b\\s*\\(|\\bimport\\s+{[^}]*\\b${func}\\b[^}]*}|\\brequire\\([^)]*\\)\\.${func}\\b)`,
      'g'
    ),
  }));

  // No vulnerable functions to search for
  if (vulnerableFunctions.length === 0) {
    console.log('Warning: No vulnerable functions identified to search for.');
    return results;
  }

  // Process each file
  filePaths.forEach((filePath) => {
    try {
      if (!fs.existsSync(filePath)) {
        return;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const foundFunctions = [];

      // Check for each vulnerable function
      functionRegexes.forEach(({ name, regex }) => {
        if (regex.test(content)) {
          foundFunctions.push(name);
        }
      });

      if (foundFunctions.length > 0) {
        results[filePath] = foundFunctions;
      }
    } catch (error) {
      console.error(`Error scanning file ${filePath}:`, error.message);
    }
  });

  return results;
}

/**
 * Main execution function
 */
async function main() {
  try {
    // 1. Get vulnerability information
    const vulnData = getVulnerabilityInfo(config.vulnId);

    // 2. Get the package name and vulnerable functions
    const packageName = vulnData.packageName;
    const vulnerableFunctions = vulnData.vulnerableFunctions || [];

    console.log(`Vulnerability ID: ${vulnData.id}`);
    console.log(`Package: ${packageName}`);
    console.log(
      `Vulnerable functions identified: ${vulnerableFunctions.join(', ') || 'None detected'}`
    );

    // 3. Find files using the package
    const affectedFiles = findFilesUsingPackage(packageName);
    console.log(`Found ${affectedFiles.length} files that use the package`);

    // 4. Search for vulnerable function usage
    const vulnerableUsage = findVulnerableFunctionUsage(affectedFiles, vulnerableFunctions);
    const filesWithVulnerableCode = Object.keys(vulnerableUsage);

    // 5. Report results
    console.log('\n--- VULNERABILITY SCAN RESULTS ---');
    console.log(
      `Total files with potential vulnerable function calls: ${filesWithVulnerableCode.length}`
    );

    if (filesWithVulnerableCode.length > 0) {
      console.log('\nFiles containing vulnerable function calls:');
      filesWithVulnerableCode.forEach((file) => {
        console.log(`\n${file}:`);
        vulnerableUsage[file].forEach((func) => {
          console.log(`  - ${func}`);
        });
      });
    } else {
      console.log('\nNo usage of vulnerable functions found in codebase!');
    }

    // 6. Save results to file if requested
    if (config.outputFile) {
      const output = {
        vulnerabilityId: config.vulnId,
        vulnerabilityInfo: vulnData,
        scanResults: vulnerableUsage,
        summary: {
          totalFilesScanned: affectedFiles.length,
          filesWithVulnerableCalls: filesWithVulnerableCode.length,
        },
      };

      fs.writeFileSync(config.outputFile, JSON.stringify(output, null, 2));
      console.log(`\nDetailed results saved to: ${config.outputFile}`);
    }
  } catch (error) {
    console.error('Error during vulnerability scan:', error.message);
    process.exit(1);
  }
}

main();
