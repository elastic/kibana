/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';
import { Lifecycle } from '../lifecycle';
import { Mocha } from '../../fake_mocha_types';

/**
 *  Run the tests that have already been loaded into
 *  mocha. aborts tests on 'cleanup' lifecycle runs
 *
 *  @param  {Lifecycle} lifecycle
 *  @param  {ToolingLog} log
 *  @param  {Mocha} mocha
 *  @return {Promise<Number>} resolves to the number of test failures
 */
export async function runTests(lifecycle: Lifecycle, mocha: Mocha, abortSignal?: AbortSignal) {
  let runComplete = false;
  const runner = mocha.run(() => {
    runComplete = true;
  });

  Rx.race(
    lifecycle.cleanup.before$,
    abortSignal ? Rx.fromEvent(abortSignal, 'abort').pipe(Rx.take(1)) : Rx.NEVER
  ).subscribe({
    next() {
      if (!runComplete) {
        runComplete = true;
        runner.uncaught(new Error('Forcing mocha to abort'));
        runner.abort();
      }
    },
  });

  return new Promise((resolve) => {
    const respond = () => resolve(runner.failures);

    // if there are no tests, mocha.run() is sync
    // and the 'end' event can't be listened to
    if (runComplete) {
      respond();
    } else {
      runner.on('end', respond);
    }
  });


  // async checkLinks() {
  //   // let url;
  //   const urls = new Set([]);

  //   // change this to test "if tests are running?"
  //   while (!runComplete) {

  //     const linkList = await this.find.allByCssSelector('a', 100);
  //     this.log.debug(`\n>>>>>>>>>>>>>>>>>>>>>>>>>>>> found ${linkList.length} links`);

  //     const links = await Promise.all(
  //       linkList.map(async (link) => {
  //         try {
  //           const url = await link.getAttribute('href');
  //           // if url is NOT in urls, add it and test it
  //           if (urls.has(url)) {
  //             this.log.debug(`----- ${url} is already in set`);
  //           } else {
  //             urls.add(url);
  //             try {
  //               const response = await request.head(url);
  //               this.log.debug(`${url} response: ${response.status}`);
  //               return { url, code: response.status };
  //             } catch (err) {
  //               this.log.debug(err);
  //             }
  //           }
  //         } catch (err) {
  //           // this should catch the stale element exceptions that happen
  //           // when the page changes after we get the 'a' elements when we try to get the 'href's.
  //         }
  //       })
  //     );
  //     await this.sleep(1000);
  //   }

  //   const deadlinks = links.filter((l) => l.code !== 200);
  //   if (deadlinks.length > 0) {
  //     deadlinks.forEach((l) => this.log.debug(`${l.url} response: is ${l.code} but 200 expected`));
  //     throw new Error('Dead links found');
  //   }

}
