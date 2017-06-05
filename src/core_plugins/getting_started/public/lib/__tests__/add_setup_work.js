import expect from 'expect.js';
import sinon from 'sinon';
import { set } from 'lodash';
import uiChrome from 'ui/chrome';
import { Notifier } from 'ui/notify/notifier';
import { WAIT_FOR_URL_CHANGE_TOKEN } from 'ui/routes';
import { gettingStartedGateCheck } from '../add_setup_work';
import {
  GETTING_STARTED_ROUTE,
  CREATE_INDEX_PATTERN_ROUTE
} from '../constants';
import {
  hasOptedOutOfGettingStarted,
  undoOptOutOfGettingStarted
} from 'ui/getting_started/opt_out_helpers';

describe('Getting Started page', () => {
  describe('add_setup_work', () => {
    describe('gettingStartedGateCheck', () => {

      let getIds;
      let kbnUrl;
      let config;
      let $route;

      beforeEach(() => {
        kbnUrl = {
          change: sinon.spy()
        };
        $route = {};
        set($route, 'current.$$route', {});
      });

      describe('if the user is on an embedded page', () => {
        beforeEach(() => {
          set($route, 'current.params.embed', true);
        });

        it('should not show the UI chrome', () => {
          expect(uiChrome.getVisible()).to.be(false);
        });
      });

      describe('if index patterns exist', () => {
        beforeEach(() => {
          config = {
            get: sinon.stub(),
            set: sinon.spy()
          };
          getIds = sinon.stub()
            .returns(Promise.resolve([ 'logstash-*', 'cars' ]));
        });

        it('sets the chrome to visible', async () => {
          await gettingStartedGateCheck(getIds, kbnUrl, config, $route);
          expect(uiChrome.getVisible()).to.be(true);
        });

        it('opts the user out of the Getting Started page', async () => {
          await gettingStartedGateCheck(getIds, kbnUrl, config, $route);
          expect(hasOptedOutOfGettingStarted()).to.be(true);
        });

        describe('if the current route does not require a default index pattern', () => {
          beforeEach(() => {
            $route.current.$$route.requireDefaultIndex = false;
          });

          it('returns without performing any default index pattern checks', async () => {
            await gettingStartedGateCheck(getIds, kbnUrl, config, $route);
            expect(config.get.called).to.be(false);
            expect(config.set.called).to.be(false);
          });
        });

        describe('if the current route requires a default index pattern', () => {
          beforeEach(() => {
            set($route, 'current.$$route.requireDefaultIndex', true);
          });

          describe('if a default index pattern exists', () => {
            beforeEach(() => {
              config.get
                .withArgs('defaultIndex')
                .returns('an-index-pattern');
            });

            it('returns without setting a default index pattern', async () => {
              await gettingStartedGateCheck(getIds, kbnUrl, config, $route);
              expect(config.set.called).to.be(false);
            });
          });

          describe('if a default index pattern does not exist', () => {
            beforeEach(() => {
              config.get
                .withArgs('defaultIndex')
                .returns(undefined);
            });

            it('sets the first index pattern as the default index pattern', async () => {
              await gettingStartedGateCheck(getIds, kbnUrl, config, $route);
              expect(config.set.calledWith('defaultIndex', 'logstash-*')).to.be(true);
            });
          });
        });
      });

      describe('if no index patterns exist', () => {
        beforeEach(() => {
          getIds = sinon.stub()
            .returns(Promise.resolve([]));
        });

        describe('if user has opted out of the Getting Started page', () => {
          it('sets the chrome to visible', async () => {
            await gettingStartedGateCheck(getIds, kbnUrl, config, $route);
            expect(uiChrome.getVisible()).to.be(true);
          });

          describe('if the current route does not require a default index pattern', () => {
            beforeEach(() => {
              $route.current.$$route.requireDefaultIndex = false;
            });

            it('returns without redirecting the user', async () => {
              await gettingStartedGateCheck(getIds, kbnUrl, config, $route);
              expect(kbnUrl.change.called).to.be(false);
            });
          });

          describe('if the current route requires a default index pattern', () => {
            beforeEach(() => {
              $route.current.$$route.requireDefaultIndex = true;
            });

            afterEach(() => {
              // Clear out any notifications
              Notifier.prototype._notifs.length = 0;
            });

            it('redirects the user to the Create Index Pattern page', async () => {
              try {
                await gettingStartedGateCheck(getIds, kbnUrl, config, $route);
              } catch (e) {
                expect(e).to.be(WAIT_FOR_URL_CHANGE_TOKEN);
              }
              expect(kbnUrl.change.calledWith(CREATE_INDEX_PATTERN_ROUTE)).to.be(true);
            });
          });
        });

        describe('if the user has not opted out of the Getting Started page', () => {
          beforeEach(() => {
            undoOptOutOfGettingStarted();
            getIds = sinon.stub()
              .returns(Promise.resolve([]));
          });

          describe('if the user is not already on Getting Started page', () => {
            beforeEach(() => {
              $route.current.$$route.originalPath = 'discover';
            });

            it('redirects the user to the Getting Started page', async () => {
              try {
                await gettingStartedGateCheck(getIds, kbnUrl, config, $route);
              } catch (e) {
                expect(e).to.be(WAIT_FOR_URL_CHANGE_TOKEN);
              }
              expect(kbnUrl.change.calledWith(GETTING_STARTED_ROUTE)).to.be(true);
            });
          });

          describe('if the user is already on Getting Started page', () => {
            beforeEach(() => {
              $route.current.$$route.originalPath = GETTING_STARTED_ROUTE;
            });

            it('redirects the user to the Getting Started page', async () => {
              await gettingStartedGateCheck(getIds, kbnUrl, config, $route);
              expect(kbnUrl.change.called).to.be(false);
            });
          });
        });
      });
    });
  });
});