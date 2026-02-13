/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Removed setup_node_env to avoid bootstrap dependency - script works standalone

const { Octokit } = require('@octokit/rest');
const nodemailer = require('nodemailer');

/**
 * Script to fetch GitHub issues with "Bug" and "Team: SecuritySolution" labels
 * created in the last 24 hours and send an email report.
 *
 * Environment variables required:
 * - GITHUB_TOKEN: GitHub personal access token for API authentication
 * - SMTP_HOST: SMTP server host (e.g., smtp.gmail.com)
 * - SMTP_PORT: SMTP server port (e.g., 587)
 * - SMTP_USER: Email address to send from
 * - SMTP_PASS: Email password or app-specific password
 * - REPORT_EMAIL_TO: Comma-separated list of recipient email addresses
 *
 * Optional environment variables:
 * - GITHUB_OWNER: GitHub repository owner (default: elastic)
 * - GITHUB_REPO: GitHub repository name (default: kibana)
 */

const GITHUB_OWNER = process.env.GITHUB_OWNER || 'elastic';
const GITHUB_REPO = process.env.GITHUB_REPO || 'kibana';

async function fetchRecentBugs() {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }

  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  // Calculate 24 hours ago timestamp
  const since = new Date();
  since.setHours(since.getHours() - 24);
  const sinceISO = since.toISOString();

  console.log(`Fetching issues created since: ${sinceISO}`);

  // Fetch issues with the specified labels
  // GitHub API search allows us to filter by labels and creation date
  const searchQuery = [
    `repo:${GITHUB_OWNER}/${GITHUB_REPO}`,
    'is:issue',
    'label:"Bug"',
    'label:"Team: SecuritySolution"',
    `created:>=${sinceISO}`,
  ].join(' ');

  console.log(`Search query: ${searchQuery}`);

  try {
    const { data } = await octokit.search.issuesAndPullRequests({
      q: searchQuery,
      per_page: 100,
      sort: 'created',
      order: 'desc',
    });

    console.log(`Found ${data.total_count} issues`);

    return data.items.map((issue) => ({
      id: issue.number,
      url: issue.html_url,
      title: issue.title,
      createdAt: issue.created_at,
      labels: issue.labels.map((label) => label.name),
    }));
  } catch (error) {
    console.error('Error fetching issues from GitHub:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

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

async function sendEmailReport(issues) {
  const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'REPORT_EMAIL_TO'];
  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables for email: ${missingVars.join(', ')}`
    );
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Verify connection
  try {
    await transporter.verify();
    console.log('SMTP connection verified');
  } catch (error) {
    console.error('SMTP connection failed:', error.message);
    throw error;
  }

  // Send email
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: process.env.REPORT_EMAIL_TO,
    subject: `SecuritySolution Bug Report - ${new Date().toLocaleDateString()} (${
      issues.length
    } new issues)`,
    text: generateTextReport(issues),
    html: generateHtmlReport(issues),
  };

  console.log(`Sending email to: ${process.env.REPORT_EMAIL_TO}`);

  const info = await transporter.sendMail(mailOptions);
  console.log('Email sent successfully:', info.messageId);

  return info;
}

async function main() {
  try {
    console.log('Starting SecuritySolution Bug Report generation...');
    console.log(`Repository: ${GITHUB_OWNER}/${GITHUB_REPO}`);

    // Fetch recent bugs
    const issues = await fetchRecentBugs();

    // Generate and send report
    await sendEmailReport(issues);

    console.log('Report sent successfully!');
  } catch (error) {
    console.error('Error generating report:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { fetchRecentBugs, generateHtmlReport, generateTextReport, sendEmailReport };
