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

import expect from '@kbn/expect';
import testSubjSelector from '@kbn/test-subj-selector';
import ngMock from 'ng_mock';
import sinon from 'sinon';
import $ from 'jquery';

describe('ui/modals/confirm_modal_promise', function () {

  let $rootScope;
  let message;
  let confirmModalPromise;
  let promise;

  beforeEach(function () {
    ngMock.module('kibana');
    ngMock.inject(function ($injector) {
      confirmModalPromise = $injector.get('confirmModalPromise');
      $rootScope = $injector.get('$rootScope');
    });

    message = 'woah';

    promise = confirmModalPromise(message, { confirmButtonText: 'click me' });
  });

  afterEach(function () {
    $rootScope.$digest();
    $(testSubjSelector('confirmModalConfirmButton')).click();
  });

  describe('before timeout completes', function () {
    it('returned promise is not resolved', function () {
      const callback = sinon.spy();
      promise.then(callback, callback);
      $rootScope.$apply();
      expect(callback.called).to.be(false);
    });
  });

  describe('after timeout completes', function () {
    it('confirmation dialogue is loaded to dom with message', function () {
      $rootScope.$digest();
      const confirmModalElement = $(testSubjSelector('confirmModal'));
      expect(confirmModalElement).to.not.be(undefined);

      const htmlString = confirmModalElement[0].innerHTML;

      expect(htmlString.indexOf(message)).to.be.greaterThan(0);
    });

    describe('when confirmed', function () {
      it('promise is fulfilled with true', function () {
        const confirmCallback = sinon.spy();
        const cancelCallback = sinon.spy();

        promise.then(confirmCallback, cancelCallback);
        $rootScope.$digest();
        const confirmButton = $(testSubjSelector('confirmModalConfirmButton'));

        confirmButton.click();
        expect(confirmCallback.called).to.be(true);
        expect(cancelCallback.called).to.be(false);
      });
    });

    describe('when canceled', function () {
      it('promise is rejected with false', function () {
        const confirmCallback = sinon.spy();
        const cancelCallback = sinon.spy();
        promise.then(confirmCallback, cancelCallback);

        $rootScope.$digest();
        const noButton = $(testSubjSelector('confirmModalCancelButton'));
        noButton.click();

        expect(cancelCallback.called).to.be(true);
        expect(confirmCallback.called).to.be(false);
      });
    });

    describe('error is thrown', function () {
      it('when no confirm button text is used', function () {
        const confirmCallback = sinon.spy();
        const cancelCallback = sinon.spy();
        confirmModalPromise(message).then(confirmCallback, cancelCallback);

        $rootScope.$digest();
        sinon.assert.notCalled(confirmCallback);
        sinon.assert.calledOnce(cancelCallback);
        sinon.assert.calledWithExactly(
          cancelCallback,
          sinon.match.has('message', sinon.match(/confirmation button text/))
        );
      });
    });
  });
});
