/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export default async function* customReporter(source) {
  for await (const event of source) {
    switch (event.type) {
      case 'test:start':
        yield `A test named: [${event.data.name}] started\n`;
        break;
      case 'test:pass':
        yield `A test named: [${event.data.name}] passed\n`;
        break;
      case 'test:fail':
        yield `A test named: [${event.data.name}] failed\n`;
        break;
      case 'test:plan':
        console.log(`\n### event: \n${JSON.stringify(event, null, 2)}`);
        yield 'test plan';
        break;
      case 'test:diagnostic':
        yield `${event.data.message}\n`;
        break;
      case 'test:coverage': {
        const { totalLineCount } = event.data.summary.totals;
        yield `total line count: ${totalLineCount}\n`;
        break;
      }
      default:
        console.log(`\n### on default, event: \n${JSON.stringify(event, null, 2)}`);
    }
  }
}
