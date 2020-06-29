/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import sinon from 'sinon';
import fs from 'fs';
import del from 'del';

import { cleanPrevious, cleanArtifacts } from './cleanup';
import Logger from '../lib/logger';

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
