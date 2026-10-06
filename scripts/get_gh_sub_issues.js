const axios = require('axios');

/**
 * Search for issues in a GitHub repository matching specific criteria
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} titleQuery - Text to search for in the issue title
