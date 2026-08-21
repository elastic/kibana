/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import sinon from 'sinon';
import fs from 'fs';
import { deleteSync } from 'del';
jest.mock('del', () => ({ deleteSync: jest.fn() }));

import { cleanPrevious, cleanArtifacts } from './cleanup';
import { Logger } from '../../logger';

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
          deleteSync.mockReset();
        });

        it('should resolve if the working path does not exist', function () {
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
          sinon.stub(fs, 'statSync').throws(new Error('An Unhandled Error'));

          errorStub = sinon.stub();
          return cleanPrevious(settings, logger)
            .catch(errorStub)
            .then(function () {
              expect(errorStub.called).toBe(true);
            });
        });

        it('should log a message if there was a working directory', function () {
          sinon.stub(fs, 'statSync');

          return cleanPrevious(settings, logger)
            .catch(errorStub)
            .then(function () {
              expect(logger.log.calledWith('Found previous install attempt. Deleting...')).toBe(
                true
              );
            });
        });

        it('should rethrow any exception from deleteSync', function () {
          sinon.stub(fs, 'statSync');
          deleteSync.mockImplementation(() => {
            throw new Error('I am an error thrown by del');
          });

          errorStub = sinon.stub();
          return cleanPrevious(settings, logger)
            .catch(errorStub)
            .then(function () {
              expect(errorStub.called).toBe(true);
            });
        });

        it('should resolve if the working path is deleted', function () {
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
          deleteSync.mockReset();
        });

        it('should attempt to delete the working directory', function () {
          cleanArtifacts(settings);
          expect(deleteSync).toHaveBeenCalledWith(settings.workingPath);
        });

        it('should swallow any errors thrown by deleteSync', function () {
          deleteSync.mockImplementation(() => {
            throw new Error('Something bad happened.');
          });

          expect(() => cleanArtifacts(settings)).not.toThrow();
        });
      });
    });
  });
});
