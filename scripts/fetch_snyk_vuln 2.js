#!/usr/bin/env node

/**
 * This script fetches vulnerability information from the Snyk API
 * Usage: node fetch_snyk_vuln.js --vuln=SNYK-ID [--output=json|table]
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.substring(2).split('=');
    acc[key] = value || true;
  }
  return acc;
}, {});

// Default configuration
const config = {
  vulnId: args.vuln || args.id,
  output: args.output || 'table',
  token: args.token || process.env.SNYK_TOKEN,
  outputFile: args.file,
};

// Validate required parameters
if (!config.vulnId) {
  console.error('Error: Vulnerability ID is required. Use --vuln=SNYK-ID');
  process.exit(1);
}

if (!config.token) {
  console.warn('Warning: No Snyk API token provided. Using public API with rate limits.');
  console.warn('Set SNYK_TOKEN environment variable or use --token for authenticated requests.');
}

/**
 * Extracts function names from the vulnerability description
 * @param {string} description - The vulnerability description text
 * @returns {string[]} - Array of function names found
 */
function extractVulnerableFunctions(description) {
  if (!description) return [];

  // Common patterns for function names in vulnerability descriptions
  const patterns = [
    /the\s+`([^`]+)`\s+function/gi, // the `functionName` function
    /functions?\s+['"`]([^'"`]+)['"`]/gi, // function "functionName"
    /method[s]?\s+['"`]([^'"`]+)['"`]/gi, // method "methodName"
    /vulnerable\s+(?:function|method)[s]?\s+['"`]([^'"`]+)['"`]/gi, // vulnerable function "functionName"
    /affected\s+(?:function|method)[s]?\s+['"`]([^'"`]+)['"`]/gi, // affected function "functionName"
    /\b([a-zA-Z_][a-zA-Z0-9_]*\(\))\s+(?:function|method)/gi, // functionName() function
    /\b(?:function|method)[s]?\s+([a-zA-Z_][a-zA-Z0-9_]*\(\))/gi, // function functionName()
  ];

  const functions = new Set();

  // Apply each pattern to the description
  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(description)) !== null) {
      // Clean up the function name (remove parentheses if present)
      let funcName = match[1].trim();
      funcName = funcName.replace(/\(\)$/, '');
      functions.add(funcName);
    }
  });

  return Array.from(functions);
}

/**
 * Makes a request to the Snyk API
 * @param {string} path - API path
 * @returns {Promise<Object>} - JSON response
 */
function snykApiRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'snyk.io',
      path: `/api/v1${path}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Add authorization if token is available
    if (config.token) {
      options.headers.Authorization = `token ${config.token}`;
    }

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse API response: ${e.message}`));
          }
        } else {
          reject(new Error(`API request failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * Format vulnerability data as a readable table
 * @param {Object} vuln - Vulnerability data
 * @returns {string} - Formatted output
 */
function formatAsTable(vuln) {
  if (!vuln) return 'No vulnerability data found.';

  const lines = [
    `ID:          ${vuln.id}`,
    `Title:       ${vuln.title}`,
    `Package:     ${vuln.package}`,
    `Severity:    ${vuln.severity}`,
    `CVSS:        ${vuln.cvssScore} (${vuln.CVE || 'No CVE'})`,
    `Published:   ${new Date(vuln.publicationTime).toLocaleString()}`,
    `URL:         https://snyk.io/vuln/${vuln.id}`,
    '',
    'Description:',
    `${vuln.description}`,
  ];

  // Extract and display vulnerable functions
  const vulnerableFunctions = extractVulnerableFunctions(vuln.description);
  if (vulnerableFunctions.length > 0) {
    lines.push('', 'Vulnerable Functions:');
    vulnerableFunctions.forEach((func) => {
      lines.push(`- ${func}`);
    });
  }

  lines.push('', 'Remediation:');
  lines.push(`${vuln.remediation?.advice || 'No remediation advice available.'}`);

  if (vuln.patches && vuln.patches.length) {
    lines.push('', 'Available patches:');
    vuln.patches.forEach((patch) => {
      lines.push(`- ${patch.id}: ${patch.version} - ${patch.comments}`);
    });
  }

  return lines.join('\n');
}

// Main execution
async function main() {
  try {
    console.log(`Fetching vulnerability information for ${config.vulnId}...`);

    const vulnData = await snykApiRequest(`/vuln/${config.vulnId}`);

    // Extract vulnerable functions
    const vulnerableFunctions = extractVulnerableFunctions(vulnData.description);

    // Add the extracted functions to the data
    vulnData.vulnerableFunctions = vulnerableFunctions;

    let output;
    if (config.output === 'json') {
      output = JSON.stringify(vulnData, null, 2);
    } else {
      output = formatAsTable(vulnData);
    }

    if (config.outputFile) {
      fs.writeFileSync(path.resolve(config.outputFile), output);
      console.log(`Results saved to ${config.outputFile}`);
    } else {
      console.log('\n' + output);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
