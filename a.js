const fs = require('fs');
const path = require('path');
const schemaPath = path.join(process.env.HOME, 'Downloads', 'schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

// Try to follow one of the broken references
const refPath = '#/definitions/WorkflowSchema/properties/settings/properties/on-failure/properties/fallback/items/anyOf/644/properties/with/properties/cases/items/properties/connector/anyOf/0';
console.log('Checking reference:', refPath);

try {
  // Navigate the path manually
  let current = schema;
  const parts = refPath.substring(2).split('/'); // Remove '#/' and split
  
  console.log('Navigating path...');
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    console.log('Step ' + (i+1) + ': Looking for \"' + part + '\" in object with keys:', Object.keys(current || {}));
    
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
      console.log('  ✓ Found');
    } else {
      console.log('  ✗ NOT FOUND - This is where the reference breaks!');
      console.log('  Available keys at this level:', Object.keys(current || {}));
      break;
    }
  }
  
  if (current !== schema) {
    console.log('\\nFinal result:', JSON.stringify(current, null, 2).substring(0, 200));
  }
} catch (e) {
  console.log('Error navigating reference:', e.message);
}
