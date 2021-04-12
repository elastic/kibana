/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import sinon from 'sinon';

import { Logger } from './logger';

describe('kibana cli', function () {
  describe('plugin installer', function () {
    describe('logger', function () {
      let logger;

      describe('logger.log', function () {
        beforeEach(function () {
          sinon.stub(process.stdout, 'write');
        });

        afterEach(function () {
          process.stdout.write.restore();
        });

        it('should log messages to the console and append a new line', function () {
          logger = new Logger({ silent: false, quiet: false });
          const message = 'this is my message';

          logger.log(message);

          const callCount = process.stdout.write.callCount;
          expect(process.stdout.write.getCall(callCount - 2).args[0]).toBe(message);
          expect(process.stdout.write.getCall(callCount - 1).args[0]).toBe('\n');
        });

        it('should log messages to the console and append not append a new line', function () {
          logger = new Logger({ silent: false, quiet: false });
          for (let i = 0; i < 10; i++) {
            logger.log('.', true);
          }
          logger.log('Done!');

          expect(process.stdout.write.callCount).toBe(13);
          expect(process.stdout.write.getCall(0).args[0]).toBe('.');
          expect(process.stdout.write.getCall(1).args[0]).toBe('.');
          expect(process.stdout.write.getCall(2).args[0]).toBe('.');
          expect(process.stdout.write.getCall(3).args[0]).toBe('.');
          expect(process.stdout.write.getCall(4).args[0]).toBe('.');
          expect(process.stdout.write.getCall(5).args[0]).toBe('.');
          expect(process.stdout.write.getCall(6).args[0]).toBe('.');
          expect(process.stdout.write.getCall(7).args[0]).toBe('.');
          expect(process.stdout.write.getCall(8).args[0]).toBe('.');
          expect(process.stdout.write.getCall(9).args[0]).toBe('.');
          expect(process.stdout.write.getCall(10).args[0]).toBe('\n');
          expect(process.stdout.write.getCall(11).args[0]).toBe('Done!');
          expect(process.stdout.write.getCall(12).args[0]).toBe('\n');
        });

        it('should not log any messages when quiet is set', function () {
          logger = new Logger({ silent: false, quiet: true });

          const message = 'this is my message';
          logger.log(message);

          for (let i = 0; i < 10; i++) {
            logger.log('.', true);
          }
          logger.log('Done!');

          expect(process.stdout.write.callCount).toBe(0);
        });

        it('should not log any messages when silent is set', function () {
          logger = new Logger({ silent: true, quiet: false });

          const message = 'this is my message';
          logger.log(message);

          for (let i = 0; i < 10; i++) {
            logger.log('.', true);
          }
          logger.log('Done!');

          expect(process.stdout.write.callCount).toBe(0);
        });
      });

      describe('logger.error', function () {
        beforeEach(function () {
          sinon.stub(process.stderr, 'write');
        });

        afterEach(function () {
          process.stderr.write.restore();
        });

        it('should log error messages to the console and append a new line', function () {
          logger = new Logger({ silent: false, quiet: false });
          const message = 'this is my error';

          logger.error(message);
          expect(process.stderr.write.calledWith(message + '\n')).toBe(true);
        });

        it('should log error messages to the console when quiet is set', function () {
          logger = new Logger({ silent: false, quiet: true });
          const message = 'this is my error';

          logger.error(message);
          expect(process.stderr.write.calledWith(message + '\n')).toBe(true);
        });

        it('should not log any error messages when silent is set', function () {
          logger = new Logger({ silent: true, quiet: false });
          const message = 'this is my error';

          logger.error(message);
          expect(process.stderr.write.callCount).toBe(0);
        });
      });
    });
  });
});
