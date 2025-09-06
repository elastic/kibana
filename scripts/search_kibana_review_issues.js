#!/usr/bin/env node
const axios = require('axios');

/**
 * Search for issues in a GitHub repository matching specific criteria
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} titleQuery - Text to search for in the issue title
 * @param {string} token - GitHub API token
 * @returns {Promise<Array>} - Array of matching issues with details
 */
async function searchIssues(owner, repo, titleQuery, token) {
  try {
    // Build the GitHub search query
    let searchQuery = `repo:${owner}/${repo} is:issue`;

    if (titleQuery) {
      searchQuery += ` in:title "${titleQuery}"`;
    }

    const url = `https://api.github.com/search/issues?q=${encodeURIComponent(
      searchQuery
    )}&per_page=100`;

    console.log(`Searching for issues with title containing: "${titleQuery}"`);

    const response = await axios.get(url, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.data.items) {
      console.error('Unexpected response structure:', JSON.stringify(response.data, null, 2));
      return [];
    }

    // For each search result, fetch the full issue details to get all assignees
    console.log(`Found ${response.data.items.length} matching issues. Fetching details...`);

    const detailedIssues = await Promise.all(
      response.data.items.map(async (issue) => {
        // Get detailed issue info including all assignees
        return getIssueDetails(owner, repo, issue.number, token);
      })
    );

    // Filter out any null results from failed requests
    return detailedIssues.filter((issue) => issue !== null);
  } catch (error) {
    console.error('Error searching issues:', error.response?.data?.message || error.message);
    if (
      error.response?.status === 403 &&
      error.response?.headers?.['x-ratelimit-remaining'] === '0'
    ) {
      console.error('GitHub API rate limit exceeded. Try using a personal access token.');
    }
    return [];
  }
}

/**
 * Get detailed information about a specific issue
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} issueNumber - Issue number
 * @param {string} token - GitHub API token
 * @returns {Promise<Object>} - Issue details
 */
async function getIssueDetails(owner, repo, issueNumber, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    return {
      url: response.data.html_url,
      number: response.data.number,
      title: response.data.title,
      state: response.data.state,
      assignees: response.data.assignees?.map((a) => a.login) || [],
      createdAt: response.data.created_at,
      updatedAt: response.data.updated_at,
    };
  } catch (error) {
    console.error(
      `Error fetching issue ${owner}/${repo}#${issueNumber}:`,
      error.response?.data?.message || error.message
    );
    return null;
  }
}

/**
 * Main function to run the script
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let owner = '';
  let repo = '';
  let titleQuery = '';
  let token = process.env.GITHUB_TOKEN || '';
  let format = 'normal'; // Default format is normal, add 'sheet' option for spreadsheet format

  // Process command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--owner' && args[i + 1]) {
      owner = args[i + 1];
      i++;
    } else if (args[i] === '--repo' && args[i + 1]) {
      repo = args[i + 1];
      i++;
    } else if (args[i] === '--title' && args[i + 1]) {
      titleQuery = args[i + 1];
      i++;
    } else if (args[i] === '--token' && args[i + 1]) {
      token = args[i + 1];
      i++;
    } else if (args[i] === '--format' && args[i + 1]) {
      format = args[i + 1].toLowerCase();
      i++;
    }
  }

  // Check required parameters
  if (!owner || !repo || !titleQuery) {
    console.error('Missing required parameters');
    console.log(
      'Usage: node search_kibana_review_issues.js --owner <owner> --repo <repo> --title <title_query> [--token <github_token>] [--format <normal|sheet>]'
    );
    console.log('');
    console.log(
      'Example: node search_kibana_review_issues.js --owner elastic --repo kibana --title "Fix dropdown"'
    );
    console.log('');
    console.log('You can also set your GitHub token using the GITHUB_TOKEN environment variable');
    console.log('');
    console.log('Format options:');
    console.log('  normal: Standard human-readable output (default)');
    console.log('  sheet: Tab-separated format suitable for pasting into Google Sheets');
    process.exit(1);
  }

  try {
    // Search for matching issues
    const issues = await searchIssues(owner, repo, titleQuery, token);

    // Display results
    if (issues.length === 0) {
      console.log('No matching issues found.');
      return;
    }

    if (format === 'sheet') {
      // Output in spreadsheet-compatible format (CSV values)

      // Headers for the spreadsheet
      console.log('Issue Number,Title,Status,URL,Assignees');

      // Data rows
      issues.forEach((issue) => {
        // Escape commas in the title to avoid breaking the CSV format
        const escapedTitle = issue.title.replace(/"/g, '""');

        // Format assignees as space-separated in a single column
        const assigneesText =
          issue.assignees && issue.assignees.length > 0 ? issue.assignees.join(' ') : 'unassigned';

        console.log(
          `${issue.number},"${escapedTitle}",${issue.state},"${issue.url}",${assigneesText}`
        );
      });
    } else {
      // Normal human-readable output
      issues.forEach((issue) => {
        console.log(`- Issue #${issue.number}: ${issue.title}`);
        console.log(`  Status: ${issue.state}`);
        console.log(`  URL: ${issue.url}`);
        console.log(`  Assignees: ${issue.assignees.join(', ') || 'unassigned'}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
