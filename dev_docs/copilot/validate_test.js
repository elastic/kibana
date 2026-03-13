#!/usr/bin/env node

/**
 * Copilot Assignment Test Validation Script
 * 
 * This script validates the copilot assignment test by checking:
 * 1. Test files exist
 * 2. Configuration is valid
 * 3. Basic environment checks
 */

const fs = require('fs');
const path = require('path');

function validateTestFiles() {
  const testDir = path.join(__dirname);
  const expectedFiles = [
    'copilot_test.md',
    'copilot_test_config.json'
  ];

  console.log('🔍 Validating copilot test files...');
  
  const results = {
    filesFound: 0,
    totalFiles: expectedFiles.length,
    errors: []
  };

  expectedFiles.forEach(file => {
    const filePath = path.join(testDir, file);
    if (fs.existsSync(filePath)) {
      results.filesFound++;
      console.log(`✅ Found: ${file}`);
    } else {
      results.errors.push(`Missing: ${file}`);
      console.log(`❌ Missing: ${file}`);
    }
  });

  return results;
}

function validateConfiguration() {
  console.log('\n🔧 Validating configuration...');
  
  try {
    const configPath = path.join(__dirname, 'copilot_test_config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    const requiredFields = ['name', 'version', 'test_scenario', 'environment', 'results'];
    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length === 0) {
      console.log('✅ Configuration is valid');
      console.log(`   Test scenario: ${config.test_scenario.type}`);
      console.log(`   Status: ${config.results.status}`);
      return true;
    } else {
      console.log('❌ Configuration missing fields:', missingFields);
      return false;
    }
  } catch (error) {
    console.log('❌ Configuration validation failed:', error.message);
    return false;
  }
}

function checkEnvironment() {
  console.log('\n🌍 Environment check...');
  console.log(`   Node.js version: ${process.version}`);
  console.log(`   Platform: ${process.platform}`);
  console.log(`   Architecture: ${process.arch}`);
  console.log(`   Working directory: ${process.cwd()}`);
}

function main() {
  console.log('🚀 Copilot Assignment Test Validation\n');
  
  const fileResults = validateTestFiles();
  const configValid = validateConfiguration();
  checkEnvironment();
  
  console.log('\n📊 Summary:');
  console.log(`   Files found: ${fileResults.filesFound}/${fileResults.totalFiles}`);
  console.log(`   Configuration valid: ${configValid ? 'Yes' : 'No'}`);
  
  if (fileResults.errors.length > 0) {
    console.log('   Errors:', fileResults.errors.join(', '));
  }
  
  const success = fileResults.filesFound === fileResults.totalFiles && configValid;
  console.log(`   Overall status: ${success ? '✅ PASS' : '❌ FAIL'}`);
  
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { validateTestFiles, validateConfiguration, checkEnvironment };