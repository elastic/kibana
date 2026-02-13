/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Test script for SecuritySolution Bug Report
 * 
 * This is a standalone test that validates the script structure without requiring
 * dependencies. Run after `yarn kbn bootstrap` to test with actual dependencies.
 */

const fs = require('fs');
const path = require('path');

// Mock test data
const mockIssues = [
  {
    id: 12345,
    url: 'https://github.com/elastic/kibana/issues/12345',
    title: '[Security Solution] Critical authentication bypass vulnerability',
    createdAt: new Date().toISOString(),
    labels: ['Bug', 'Team: SecuritySolution', 'priority:critical'],
  },
  {
    id: 12346,
    url: 'https://github.com/elastic/kibana/issues/12346',
    title: '[Security Solution] Detection rules not loading properly',
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    labels: ['Bug', 'Team: SecuritySolution'],
  },
  {
    id: 12347,
    url: 'https://github.com/elastic/kibana/issues/12347',
    title: '[Security Solution] UI freezes when viewing large datasets',
    createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    labels: ['Bug', 'Team: SecuritySolution', 'ui'],
  },
];

// Inline minimal versions of the report generation functions for testing
function generateHtmlReport(issues) {
  if (issues.length === 0) {
    return `
      <html>
        <body>
          <h2>SecuritySolution Bug Report - ${new Date().toLocaleDateString()}</h2>
          <p>No new bugs reported in the last 24 hours.</p>
        </body>
      </html>
    `;
  }

  const issueRows = issues
    .map(
      (issue) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${issue.id}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">
            <a href="${issue.url}">${issue.title}</a>
          </td>
          <td style="padding: 8px; border: 1px solid #ddd;">${new Date(
            issue.createdAt
          ).toLocaleString()}</td>
        </tr>
      `
    )
    .join('');

  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th { background-color: #f2f2f2; padding: 12px; text-align: left; border: 1px solid #ddd; }
          td { padding: 8px; border: 1px solid #ddd; }
          tr:hover { background-color: #f5f5f5; }
          h2 { color: #333; }
          .summary { background-color: #e8f4f8; padding: 10px; border-left: 4px solid #0078d4; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h2>SecuritySolution Bug Report - ${new Date().toLocaleDateString()}</h2>
        <div class="summary">
          <strong>Total bugs reported in last 24 hours:</strong> ${issues.length}
        </div>
        <table>
          <thead>
            <tr>
              <th>Issue #</th>
              <th>Title</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            ${issueRows}
          </tbody>
        </table>
      </body>
    </html>
  `;
}

function generateTextReport(issues) {
  if (issues.length === 0) {
    return `SecuritySolution Bug Report - ${new Date().toLocaleDateString()}\n\nNo new bugs reported in the last 24 hours.`;
  }

  const issueList = issues
    .map(
      (issue) =>
        `\nIssue #${issue.id}: ${issue.title}\nURL: ${issue.url}\nCreated: ${new Date(
          issue.createdAt
        ).toLocaleString()}\n`
    )
    .join('\n---\n');

  return `SecuritySolution Bug Report - ${new Date().toLocaleDateString()}

Total bugs reported in last 24 hours: ${issues.length}

${issueList}`;
}

async function testReportGeneration() {
  console.log('==========================================');
  console.log('Testing SecuritySolution Bug Report');
  console.log('==========================================\n');

  // Test 1: HTML Report Generation
  console.log('Test 1: Generating HTML Report...');
  try {
    const htmlReport = generateHtmlReport(mockIssues);
    console.log('✓ HTML report generated successfully');
    console.log(`  Length: ${htmlReport.length} characters`);
    
    // Save to temp file for inspection
    const tmpFile = path.join('/tmp', 'security_bug_report_test.html');
    fs.writeFileSync(tmpFile, htmlReport);
    console.log(`  Saved to: ${tmpFile}`);
  } catch (error) {
    console.error('✗ HTML report generation failed:', error.message);
    return false;
  }

  // Test 2: Text Report Generation
  console.log('\nTest 2: Generating Text Report...');
  try {
    const textReport = generateTextReport(mockIssues);
    console.log('✓ Text report generated successfully');
    console.log(`  Length: ${textReport.length} characters`);
    console.log('\nPreview:');
    console.log('--- Start of Report ---');
    console.log(textReport);
    console.log('--- End of Report ---');
  } catch (error) {
    console.error('✗ Text report generation failed:', error.message);
    return false;
  }

  // Test 3: Empty Issues Report
  console.log('\nTest 3: Generating report with no issues...');
  try {
    const htmlReport = generateHtmlReport([]);
    const textReport = generateTextReport([]);
    console.log('✓ Empty report generated successfully');
    console.log(`  HTML length: ${htmlReport.length} characters`);
    console.log(`  Text length: ${textReport.length} characters`);
  } catch (error) {
    console.error('✗ Empty report generation failed:', error.message);
    return false;
  }

  // Test 4: Check script file exists and is valid
  console.log('\nTest 4: Validating main script file...');
  try {
    const scriptPath = path.join(__dirname, 'report_security_solution_bugs.js');
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    
    // Check for key functions
    const hasOctokit = scriptContent.includes('Octokit');
    const hasNodemailer = scriptContent.includes('nodemailer');
    const hasFetchFunction = scriptContent.includes('fetchRecentBugs');
    const hasSendFunction = scriptContent.includes('sendEmailReport');
    
    if (hasOctokit && hasNodemailer && hasFetchFunction && hasSendFunction) {
      console.log('✓ Main script structure validated');
      console.log('  - Octokit import found');
      console.log('  - nodemailer import found');
      console.log('  - fetchRecentBugs function found');
      console.log('  - sendEmailReport function found');
    } else {
      console.error('✗ Main script missing required components');
      return false;
    }
  } catch (error) {
    console.error('✗ Script validation failed:', error.message);
    return false;
  }

  console.log('\n==========================================');
  console.log('All tests completed successfully! ✓');
  console.log('==========================================');
  return true;
}

// Test email configuration check
function testEmailConfig() {
  console.log('\n==========================================');
  console.log('Email Configuration Check');
  console.log('==========================================\n');

  const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'REPORT_EMAIL_TO'];
  const configStatus = {};

  requiredVars.forEach((varName) => {
    const value = process.env[varName];
    configStatus[varName] = value ? '✓ Set' : '✗ Not set';
  });

  console.log('Required environment variables:');
  Object.entries(configStatus).forEach(([key, status]) => {
    console.log(`  ${key}: ${status}`);
  });

  const allSet = Object.values(configStatus).every((status) => status.startsWith('✓'));

  if (allSet) {
    console.log('\n✓ All email configuration variables are set');
    console.log('  You can send real emails by running:');
    console.log('  node scripts/report_security_solution_bugs.js');
  } else {
    console.log('\n⚠ Some email configuration variables are missing');
    console.log('  Real emails cannot be sent until all variables are set');
    console.log('  See scripts/README_SECURITY_SOLUTION_BUG_REPORT.md for details');
  }
  
  // Check GitHub token
  console.log('\nGitHub Configuration:');
  console.log(`  GITHUB_TOKEN: ${process.env.GITHUB_TOKEN ? '✓ Set' : '✗ Not set'}`);
  
  if (!process.env.GITHUB_TOKEN) {
    console.log('  To test with real GitHub data, set GITHUB_TOKEN');
  }
}

function testDependencies() {
  console.log('\n==========================================');
  console.log('Dependency Check');
  console.log('==========================================\n');
  
  try {
    require.resolve('@octokit/rest');
    console.log('✓ @octokit/rest is installed');
  } catch (e) {
    console.log('✗ @octokit/rest is NOT installed');
    console.log('  Run: yarn kbn bootstrap');
  }
  
  try {
    require.resolve('nodemailer');
    console.log('✓ nodemailer is installed');
  } catch (e) {
    console.log('✗ nodemailer is NOT installed');
    console.log('  Run: yarn kbn bootstrap');
  }
}

// Run tests
async function main() {
  try {
    const success = await testReportGeneration();
    testEmailConfig();
    testDependencies();

    if (!success) {
      process.exit(1);
    }
    
    console.log('\n==========================================');
    console.log('Next Steps:');
    console.log('==========================================');
    console.log('1. Run: yarn kbn bootstrap (if dependencies not installed)');
    console.log('2. Set environment variables (see README)');
    console.log('3. Test: node scripts/report_security_solution_bugs.js');
    console.log('4. Schedule: Add to crontab (see crontab example file)');
    
  } catch (error) {
    console.error('\nUnexpected error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
