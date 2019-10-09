import { resolve } from 'path';
import { createReadStream } from 'fs';

console.log('\n### Converting json-summary output to elastic search import format');

const kibanaRoot = resolve(__dirname, '../../../..');
const origCoveragePath = resolve(kibanaRoot, './target/kibana-coverage/mocha/coverage-summary.json');
// console.log(`\n### origCoveragePath: \n\t${origCoveragePath}`);
// const origCoverage = require(origCoveragePath);
// console.log(`\n### origCoverage: \n\t${origCoverage}`);

import { fromEventPattern } from 'rxjs';
import { map, mergeAll, mergeMap } from 'rxjs/operators';
import Oboe from 'oboe';


// create another oboe instance
Oboe(createReadStream(origCoveragePath))
  .on('node', {
    '!.total': total => {
      console.log(`\n### Total Coverage: \n\t${JSON.stringify(total, null, 2)}`);
    },
  })
  .on('done', () => console.log('\n### done'));
