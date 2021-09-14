/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import sinon from 'sinon';

import { Progress } from './progress';
import { Logger } from '../lib/logger';

describe('kibana cli', function () {
  describe('plugin installer', function () {
    describe('progressReporter', function () {
      let logger;
      let progress;

      beforeEach(function () {
        logger = new Logger({ silent: false, quiet: false });
        sinon.stub(logger, 'log');
        sinon.stub(logger, 'error');
        progress = new Progress(logger);
      });

      afterEach(function () {
        logger.log.restore();
        logger.error.restore();
      });

      describe('handleData', function () {
        it('should show a max of 20 dots for full progress', function () {
          progress.init(1000);
          progress.progress(1000);
          progress.complete();

          expect(logger.log.callCount).toBe(22);
          expect(logger.log.getCall(0).args[0]).toMatch(/transfer/i);
          expect(logger.log.getCall(1).args[0]).toBe('.');
          expect(logger.log.getCall(2).args[0]).toBe('.');
          expect(logger.log.getCall(3).args[0]).toBe('.');
          expect(logger.log.getCall(4).args[0]).toBe('.');
          expect(logger.log.getCall(5).args[0]).toBe('.');
          expect(logger.log.getCall(6).args[0]).toBe('.');
          expect(logger.log.getCall(7).args[0]).toBe('.');
          expect(logger.log.getCall(8).args[0]).toBe('.');
          expect(logger.log.getCall(9).args[0]).toBe('.');
          expect(logger.log.getCall(10).args[0]).toBe('.');
          expect(logger.log.getCall(11).args[0]).toBe('.');
          expect(logger.log.getCall(12).args[0]).toBe('.');
          expect(logger.log.getCall(13).args[0]).toBe('.');
          expect(logger.log.getCall(14).args[0]).toBe('.');
          expect(logger.log.getCall(15).args[0]).toBe('.');
          expect(logger.log.getCall(16).args[0]).toBe('.');
          expect(logger.log.getCall(17).args[0]).toBe('.');
          expect(logger.log.getCall(18).args[0]).toBe('.');
          expect(logger.log.getCall(19).args[0]).toBe('.');
          expect(logger.log.getCall(20).args[0]).toBe('.');
          expect(logger.log.getCall(21).args[0]).toMatch(/complete/i);
        });

        it('should show dot for each 5% of completion', function () {
          progress.init(1000);
          expect(logger.log.callCount).toBe(1);

          progress.progress(50); //5%
          expect(logger.log.callCount).toBe(2);

          progress.progress(100); //15%
          expect(logger.log.callCount).toBe(4);

          progress.progress(200); //25%
          expect(logger.log.callCount).toBe(8);

          progress.progress(590); //94%
          expect(logger.log.callCount).toBe(20);

          progress.progress(60); //100%
          expect(logger.log.callCount).toBe(21);

          //Any progress over 100% should be ignored.
          progress.progress(9999);
          expect(logger.log.callCount).toBe(21);

          progress.complete();
          expect(logger.log.callCount).toBe(22);

          expect(logger.log.getCall(0).args[0]).toMatch(/transfer/i);
          expect(logger.log.getCall(21).args[0]).toMatch(/complete/i);
        });
      });
    });
  });
});
