import expect from 'expect.js';
import sinon from 'sinon';
import uiChrome from 'ui/chrome';

import {
  showGettingStartedPage,
  handleGettingStartedOptedOutScenario
} from '../add_setup_work';
import {
  GETTING_STARTED_ROUTE,
  CREATE_INDEX_PATTERN_ROUTE
} from '../constants';

describe('Getting Started page', () => {
  describe('add_setup_work', () => {
    let spyKbnUrl;
    beforeEach(() => {
      spyKbnUrl = {
        change: sinon.spy()
      };
    });

    describe('showGettingStartedPage', () => {
      let isOnGettingstartedPage;

      describe('user is not already on Getting Started page', () => {
        beforeEach(() => {
          isOnGettingstartedPage = false;
        });

        it ('redirects the user to the Getting Started page', () => {
          showGettingStartedPage(spyKbnUrl, isOnGettingstartedPage);
          expect(spyKbnUrl.change.calledWith(GETTING_STARTED_ROUTE)).to.be(true);
        });
      });

      describe('user is already on Getting Started page', () => {
        beforeEach(() => {
          isOnGettingstartedPage = true;
        });

        it ('redirects the user to the Getting Started page', () => {
          showGettingStartedPage(spyKbnUrl, isOnGettingstartedPage);
          expect(spyKbnUrl.change.called).to.be(false);
        });
      });
    });

    describe('handleGettingStartedOptedOutScenario', () => {
      let currentRoute;
      beforeEach(() => {
        currentRoute = {};
      });

      it ('sets the chrome to visible', () => {
        handleGettingStartedOptedOutScenario(currentRoute, spyKbnUrl);
        expect(uiChrome.getVisible()).to.be(true);
      });

      describe('current route does not require a default index pattern', () => {
        beforeEach(() => {
          currentRoute.requireDefaultIndex = false;
        });

        it ('returns without redirecting the user', () => {
          handleGettingStartedOptedOutScenario(currentRoute, spyKbnUrl);
          expect(spyKbnUrl.change.called).to.be(false);
        });
      });

      describe('current route requires a default index pattern', () => {
        beforeEach(() => {
          currentRoute.requireDefaultIndex = true;
        });

        it ('redirects the user to the Create Index Pattern page', () => {
          handleGettingStartedOptedOutScenario(currentRoute, spyKbnUrl);
          expect(spyKbnUrl.change.calledWith(CREATE_INDEX_PATTERN_ROUTE)).to.be(true);
        });
      });
    });
  });
});