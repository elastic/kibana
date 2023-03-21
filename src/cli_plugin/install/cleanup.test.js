/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import sinon from 'sinon';
import fs from 'fs';
import del from 'del';

import { cleanPrevious, cleanArtifacts } from './cleanup';
import { Logger } from '../../cli/logger';

describe('kibana cli', function () {
  describe('plugin installer', function () {
    describe('pluginCleaner', function () {
      const settings = {
        workingPath: 'dummy',
      };

      describe('cleanPrevious', function () {
        let errorStub;
        let logger;

        beforeEach(function () {
          errorStub = sinon.stub();
          logger = new Logger(settings);
          sinon.stub(logger, 'log');
          sinon.stub(logger, 'error');
        });

        afterEach(function () {
          logger.log.restore();
          logger.error.restore();
          fs.statSync.restore();
          del.sync.restore();
        });

        it('should resolve if the working path does not exist', function () {
          sinon.stub(del, 'sync');
          sinon.stub(fs, 'statSync').callsFake(() => {
            const error = new Error('ENOENT');
            error.code = 'ENOENT';
            throw error;
          });

          return cleanPrevious(settings, logger)
            .catch(errorStub)
            .then(function () {
              expect(errorStub.called).toBe(false);
            });
        });

        it('should rethrow any exception except ENOENT from fs.statSync', function () {
          sinon.stub(del, 'sync');
          sinon.stub(fs, 'statSync').throws(new Error('An Unhandled Error'));

          errorStub = sinon.stub();
          return cleanPrevious(settings, logger)
            .catch(errorStub)
            .then(function () {
              expect(errorStub.called).toBe(true);
            });
        });

        it('should log a message if there was a working directory', function () {
          sinon.stub(del, 'sync');
          sinon.stub(fs, 'statSync');

          return cleanPrevious(settings, logger)
            .catch(errorStub)
            .then(function () {
              expect(logger.log.calledWith('Found previous install attempt. Deleting...')).toBe(
                true
              );
            });
        });

        it('should rethrow any exception from del.sync', function () {
          sinon.stub(fs, 'statSync');
          sinon.stub(del, 'sync').throws(new Error('I am an error thrown by del'));

          errorStub = sinon.stub();
          return cleanPrevious(settings, logger)
            .catch(errorStub)
            .then(function () {
              expect(errorStub.called).toBe(true);
            });
        });

        it('should resolve if the working path is deleted', function () {
          sinon.stub(del, 'sync');
          sinon.stub(fs, 'statSync');

          return cleanPrevious(settings, logger)
            .catch(errorStub)
            .then(function () {
              expect(errorStub.called).toBe(false);
            });
        });
      });

      describe('cleanArtifacts', function () {
        beforeEach(function () {});

        afterEach(function () {
          del.sync.restore();
        });

        it('should attempt to delete the working directory', function () {
          sinon.stub(del, 'sync');

          cleanArtifacts(settings);
          expect(del.sync.calledWith(settings.workingPath)).toBe(true);
        });

        it('should swallow any errors thrown by del.sync', function () {
          sinon.stub(del, 'sync').throws(new Error('Something bad happened.'));

          expect(() => cleanArtifacts(settings)).not.toThrow();
        });
      });
    });
  });
});
