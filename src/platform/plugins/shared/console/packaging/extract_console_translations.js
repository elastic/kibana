#!/usr/bin/env node

/**
 * Script to extract Console-specific translation messages from Kibana translation files
 * and create new files with only "console." prefixed messages for the packaged Console.
 */

const fs = require('fs');
const path = require('path');

// Path to the source translations directory
const SOURCE_TRANSLATIONS_DIR = path.resolve(
  __dirname,
  '../../../../../../x-pack/platform/plugins/private/translations/translations'
);

// Output directory for Console-specific translations
const OUTPUT_DIR = path.resolve(__dirname, 'translations');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Extract messages that start with "console." from a translation object
 * @param {Object} translations - The full translation object
 * @returns {Object} - Object containing only console-related messages
 */
function extractConsoleMessages(translations) {
  const consoleMessages = {};

  // Check if messages are nested under a "messages" key
  const messagesObject = translations.messages || translations;

  for (const [key, value] of Object.entries(messagesObject)) {
    if (key.startsWith('console.')) {
      consoleMessages[key] = value;
    }
  }

  return consoleMessages;
}

/**
 * Process a single translation file
 * @param {string} filename - Name of the translation file
 */
function processTranslationFile(filename) {
  const sourceFilePath = path.join(SOURCE_TRANSLATIONS_DIR, filename);
  const outputFilePath = path.join(OUTPUT_DIR, filename);

  try {
    // Read the source translation file
    let sourceContent = fs.readFileSync(sourceFilePath, 'utf8');

    // Handle en.json which uses JavaScript object syntax instead of JSON
    if (filename === 'en.json') {
      // Convert JavaScript object syntax to JSON
      // Replace unquoted property names with quoted ones
      sourceContent = sourceContent.replace(/(\w+):/g, '"$1":').replace(/'/g, '"');
    }

    const sourceTranslations = JSON.parse(sourceContent);

    // Extract console-specific messages
    const consoleMessages = extractConsoleMessages(sourceTranslations);

    // Extract formats if they exist
    const formats = sourceTranslations.formats || {};

    // Create the output structure with both formats
    const outputStructure = {
      formats,
      messages: consoleMessages,
    };

    // Write the console-specific translations to output file
    fs.writeFileSync(outputFilePath, JSON.stringify(outputStructure, null, 2), 'utf8');

    const messageCount = Object.keys(consoleMessages).length;
    console.log(`✅ Processed ${filename}: extracted ${messageCount} console messages`);
  } catch (error) {
    console.error(`❌ Error processing ${filename}:`, error.message);
  }
}

/**
 * Main function to process all translation files
 */
function main() {
  console.log('🔄 Extracting Console translation messages...\n');

  try {
    // Check if source directory exists
    if (!fs.existsSync(SOURCE_TRANSLATIONS_DIR)) {
      console.error(`❌ Source translations directory not found: ${SOURCE_TRANSLATIONS_DIR}`);
      process.exit(1);
    }

    // Get all JSON files from the source directory
    const files = fs.readdirSync(SOURCE_TRANSLATIONS_DIR).filter((file) => file.endsWith('.json'));

    if (files.length === 0) {
      console.log('⚠️  No translation files found in source directory');
      return;
    }

    console.log(`📁 Found ${files.length} translation files:`);
    files.forEach((file) => console.log(`   - ${file}`));
    console.log('');

    // Process each translation file
    files.forEach(processTranslationFile);

    console.log(`\n✅ Successfully extracted Console translations to: ${OUTPUT_DIR}`);
    console.log('\n📋 Files created:');

    // List created files
    const outputFiles = fs.readdirSync(OUTPUT_DIR);
    outputFiles.forEach((file) => {
      const filePath = path.join(OUTPUT_DIR, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const messageCount = Object.keys(content).length;
      console.log(`   - ${file} (${messageCount} messages)`);
    });
  } catch (error) {
    console.error('❌ Error during extraction:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
