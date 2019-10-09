import { resolve } from 'path';

console.log('\n### Converting json-summary output to elastic search import format');

const kibanaRoot = resolve(__dirname, '../../../..');
const origCoveragePath = resolve(kibanaRoot, './target/kibana-coverage/mocha/coverage-summary.json');
console.log(`\n### origCoveragePath: \n\t${origCoveragePath}`);

const origCoverage = require(origCoveragePath);

console.log(`\n### origCoverage: \n\t${origCoverage}`);
