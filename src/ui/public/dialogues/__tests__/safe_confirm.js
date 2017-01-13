import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';

describe.only('ui/dialogues/safe_confirm', function () {

  let $rootScope;
  let $window;
  let $timeout;
  let message;
  let safeConfirm;
  let promise;

  beforeEach(function () {
    ngMock.module('kibana');
    ngMock.inject(function ($injector) {
      safeConfirm = $injector.get('safeConfirm');
      $rootScope = $injector.get('$rootScope');
      $timeout = $injector.get('$timeout');
    });

    message = 'woah';

    promise = safeConfirm(message);
  });

  afterEach(function () {
    const confirmationDialogElement = document.querySelector('.confirm-dialogue');
    if (confirmationDialogElement) {
      const okayButton = confirmationDialogElement.getElementsByTagName('button')[0];

      $rootScope.$digest();
      angular.element(okayButton).click();
    }
  });

  context('before timeout completes', function () {
    it('returned promise is not resolved', function () {
      let isResolved = false;
      function markAsResolved() {
        isResolved = true;
      }
      promise.then(markAsResolved, markAsResolved);
      $rootScope.$apply(); // attempt to resolve the promise, but this won't flush $timeout promises
      expect(isResolved).to.be(false);
    });
  });

  context('after timeout completes', function () {
    it('confirmation dialog is loaded to dom with message', function () {
      $timeout.flush();
      const confirmationDialogElement = document.querySelector('.confirm-dialogue');
      expect(!!confirmationDialogElement).to.be(true);
      const htmlString = confirmationDialogElement.innerHTML;

      expect(htmlString.indexOf(message)).to.be.greaterThan(0);
    });

    context('when confirmed', function () {
      it('promise is fulfilled with true', function () {
        $timeout.flush();

        let value;
        promise.then((v) => {
          value = v;
        });

        const confirmationDialogElement = document.querySelector('.confirm-dialogue');
        const okayButton = confirmationDialogElement.getElementsByTagName('button')[0];

        $rootScope.$digest();
        angular.element(okayButton).click();

        expect(value).to.be(true);
      });
    });

    context('when canceled', function () {
      it('promise is rejected with false', function () {
        $timeout.flush();

        let value;
        promise.then(null, (v) => { value = v; });
        const confirmationDialogElement = document.querySelector('.confirm-dialogue');
        const noButton = confirmationDialogElement.getElementsByTagName('button')[1];

        $rootScope.$digest();
        angular.element(noButton).click();

        expect(value).to.be(false);
      });
    });
  });
});
