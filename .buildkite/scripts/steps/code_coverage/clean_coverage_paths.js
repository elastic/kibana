const { readFileSync, writeFileSync } = require('fs');
const FILE = process.argv[2];
console.log(`\n### process.env.KIBANA_DIR: \n\t${process.env.KIBANA_DIR}`);
console.log(`\n\t### Replacing paths in: \n\t${FILE}`);
// TODO-TRE: Drop hardcoded replacement
writeFileSync(FILE, readFileSync(FILE).toString().replaceAll(process.env.KIBANA_DIR, 'LEETRE'));
