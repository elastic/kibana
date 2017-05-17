import expect from 'expect.js';
import sinon from 'sinon';

import {
  showGettingStartedPage
} from '../add_setup_work';
import {  GETTING_STARTED_ROUTE } from '../constants';

describe('Getting Started page', () => {
  describe('add_setup_work', () => {
    describe('showGettingStartedPage', () => {
      let spyKbnUrl;
      let isOnGettingstartedPage;

      beforeEach(() => {
        spyKbnUrl = {
          change: sinon.spy()
        };
      });

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
  });
});