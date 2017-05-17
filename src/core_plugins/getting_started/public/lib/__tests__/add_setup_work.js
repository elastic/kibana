import expect from 'expect.js';
import sinon from 'sinon';
import uiChrome from 'ui/chrome';
import { Notifier } from 'ui/notify/notifier';

import {
  showGettingStartedPage,
  handleGettingStartedOptedOutScenario,
  handleExistingIndexPatternsScenario
} from '../add_setup_work';
import {
  GETTING_STARTED_ROUTE,
  CREATE_INDEX_PATTERN_ROUTE
} from '../constants';
import { hasOptedOutOfGettingStarted } from 'ui/getting_started/opt_out_helpers';

describe('Getting Started page', () => {
  describe('add_setup_work', () => {
    let kbnUrl;
    let currentRoute;

    beforeEach(() => {
      kbnUrl = {
        change: sinon.spy()
      };
      currentRoute = {};
    });

    describe('showGettingStartedPage', () => {
      let isOnGettingstartedPage;

      describe('user is not already on Getting Started page', () => {
        beforeEach(() => {
          isOnGettingstartedPage = false;
        });

        it ('redirects the user to the Getting Started page', () => {
          showGettingStartedPage(kbnUrl, isOnGettingstartedPage);
          expect(kbnUrl.change.calledWith(GETTING_STARTED_ROUTE)).to.be(true);
        });
      });

      describe('user is already on Getting Started page', () => {
        beforeEach(() => {
          isOnGettingstartedPage = true;
        });

        it ('redirects the user to the Getting Started page', () => {
          showGettingStartedPage(kbnUrl, isOnGettingstartedPage);
          expect(kbnUrl.change.called).to.be(false);
        });
      });
    });

    describe('handleGettingStartedOptedOutScenario', () => {
      it ('sets the chrome to visible', () => {
        handleGettingStartedOptedOutScenario(currentRoute, kbnUrl);
        expect(uiChrome.getVisible()).to.be(true);
      });

      describe('current route does not require a default index pattern', () => {
        beforeEach(() => {
          currentRoute.requireDefaultIndex = false;
        });

        it ('returns without redirecting the user', () => {
          handleGettingStartedOptedOutScenario(currentRoute, kbnUrl);
          expect(kbnUrl.change.called).to.be(false);
        });
      });

      describe('current route requires a default index pattern', () => {
        beforeEach(() => {
          currentRoute.requireDefaultIndex = true;
        });

        afterEach(() => {
          // Clear out any notifications
          Notifier.prototype._notifs.length = 0;
        });

        it ('redirects the user to the Create Index Pattern page', () => {
          handleGettingStartedOptedOutScenario(currentRoute, kbnUrl);
          expect(kbnUrl.change.calledWith(CREATE_INDEX_PATTERN_ROUTE)).to.be(true);
        });
      });
    });

    describe('handleExistingIndexPatternsScenario', () => {

      let indexPatterns;
      let config;

      beforeEach(() => {
        config = {
          get: sinon.stub(),
          set: sinon.spy()
        };
      });

      it ('sets the chrome to visible', () => {
        handleExistingIndexPatternsScenario(indexPatterns, currentRoute, config);
        expect(uiChrome.getVisible()).to.be(true);
      });

      it ('opts the user out of the Getting Started page', () => {
        handleExistingIndexPatternsScenario(indexPatterns, currentRoute, config);
        expect(hasOptedOutOfGettingStarted()).to.be(true);
      });

      describe('current route does not require a default index pattern', () => {
        beforeEach(() => {
          currentRoute.requireDefaultIndex = false;
        });

        it ('returns without performing any default index pattern checks', () => {
          handleExistingIndexPatternsScenario(indexPatterns, currentRoute, config);
          expect(config.get.called).to.be(false);
          expect(config.set.called).to.be(false);
        });
      });

      describe('current route requires a default index pattern', () => {
        beforeEach(() => {
          currentRoute.requireDefaultIndex = true;
        });

        describe('default index pattern exists', () => {
          beforeEach(() => {
            config.get
              .withArgs('defaultIndex')
              .returns('an-index-pattern');
          });

          it ('returns without setting a default index pattern', () => {
            handleExistingIndexPatternsScenario(indexPatterns, currentRoute, config);
            expect(config.set.called).to.be(false);
          });
        });

        describe('default index pattern does not exist', () => {
          beforeEach(() => {
            indexPatterns = [
              'logstash-*',
              'cars'
            ];
            config.get
              .withArgs('defaultIndex')
              .returns(undefined);
          });

          it ('sets the first index pattern as the default index pattern', () => {
            handleExistingIndexPatternsScenario(indexPatterns, currentRoute, config);
            expect(config.set.calledWith('defaultIndex', indexPatterns[0])).to.be(true);
          });
        });
      });
    });
  });
});