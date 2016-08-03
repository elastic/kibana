import sinon from 'auto-release-sinon';
import ngMock from 'ng_mock';
import expect from 'expect.js';

import '../app_switcher_link';

describe('appSwitcherLink directive', () => {
  let scope;
  let $compile;

  beforeEach(ngMock.module('kibana'));

  beforeEach(() => {
    ngMock.inject(($rootScope, _$compile_) => {
      scope = $rootScope.$new();
      $compile = _$compile_;
    });
  });

  function create(attrs) {
    const template = `
      <app-switcher-link
        app-switcher-link-is-active="appSwitcherLinkIsActive"
        app-switcher-link-is-disabled="appSwitcherLinkIsDisabled"
        app-switcher-link-tooltip="appSwitcherLinkTooltip"
        app-switcher-link-on-click="appSwitcherLinkOnClick()"
        app-switcher-link-href="appSwitcherLinkHref"
        app-switcher-link-kbn-route="appSwitcherLinkKbnRoute"
        app-switcher-link-icon="appSwitcherLinkIcon"
        app-switcher-link-title="appSwitcherLinkTitle"
      />
    `;

    const element = $compile(template)(scope);

    scope.$apply(() => {
      Object.assign(scope, attrs);
    });

    return element;
  }

  describe('interface', () => {

    describe('appSwitcherLinkIsActive attribute', () => {
      it(`doesn't apply the active class when false`, () => {
        const element = create({
          appSwitcherLinkIsActive: false,
        });
        expect(element.hasClass('active')).to.be(false);
      });

      it('applies the active class when true', () => {
        const element = create({
          appSwitcherLinkIsActive: true,
        });
        expect(element.hasClass('active')).to.be(true);
      });
    });

    describe('appSwitcherLinkIsDisabled attribute', () => {
      it(`doesn't apply the is-app-switcher-link-disabled class when false`, () => {
        const element = create({
          appSwitcherLinkIsDisabled: false,
        });
        expect(element.hasClass('is-app-switcher-link-disabled')).to.be(false);
      });

      it('applies the is-app-switcher-link-disabled class when true', () => {
        const element = create({
          appSwitcherLinkIsDisabled: true,
        });
        expect(element.hasClass('is-app-switcher-link-disabled')).to.be(true);
      });
    });

    describe('appSwitcherLinkTooltip attribute', () => {
      it('is applied to the tooltip directive', () => {
        const attrs = {
          appSwitcherLinkTooltip: 'hello i am a tooltip',
        };
        const element = create(attrs);
        expect(element.attr('tooltip')).to.be(attrs.appSwitcherLinkTooltip);
      });
    });

    describe('appSwitcherLinkOnClick attribute', () => {
      it('is called when the link is clicked', () => {
        const attrs = {
          appSwitcherLinkOnClick: sinon.spy(),
        };
        const element = create(attrs);
        element.find('[data-test-subj=appLink]').click();
        sinon.assert.called(attrs.appSwitcherLinkOnClick);
      });
    });

    describe('appSwitcherLinkHref attribute', () => {
      it('is applied to the link', () => {
        const attrs = {
          appSwitcherLinkHref: 'link to a website',
        };
        const element = create(attrs);
        const link = element.find('[data-test-subj=appLink]');
        expect(link.attr('href')).to.be(attrs.appSwitcherLinkHref);
      });
    });

    describe('appSwitcherLinkKbnRoute attribute', () => {
      it(`is applied to the link when href isn't defined`, () => {
        const attrs = {
          appSwitcherLinkKbnRoute: '#test',
        };
        const element = create(attrs);
        const link = element.find('[data-test-subj=appLink]');
        expect(link.attr('href')).to.be(attrs.appSwitcherLinkKbnRoute);
      });

      it(`isn't applied to the link when href is defined`, () => {
        const attrs = {
          appSwitcherLinkHref: 'link to a website',
          appSwitcherLinkKbnRoute: '#test',
        };
        const element = create(attrs);
        const link = element.find('[data-test-subj=appLink]');
        expect(link.attr('href')).not.to.be(attrs.appSwitcherLinkKbnRoute);
      });
    });

    describe('appSwitcherLinkIcon attribute', () => {
      describe('when present', () => {
        it('displays the img element', () => {
          const attrs = {
            appSwitcherLinkIcon: 'icon url',
          };
          const element = create(attrs);
          const img = element.find('img');
          expect(img.length).to.be(1);
        });

        it('hides the placeholder', () => {
          const attrs = {
            appSwitcherLinkIcon: 'icon url',
          };
          const element = create(attrs);
          const placeholder = element.find('[data-test-subj=appLinkIconPlaceholder]');
          expect(placeholder.length).to.be(0);
        });

        it(`is set as the img src`, () => {
          const attrs = {
            appSwitcherLinkIcon: 'icon url',
          };
          const element = create(attrs);
          const img = element.find('img');
          expect(img.attr('src')).to.contain(encodeURI(attrs.appSwitcherLinkIcon));
        });
      });

      describe('when not present', () => {
        it('hides the img element', () => {
          const attrs = {
            appSwitcherLinkIcon: undefined,
          };
          const element = create(attrs);
          const img = element.find('img');
          expect(img.length).to.be(0);
        });

        it('displays the placeholder', () => {
          const attrs = {
            appSwitcherLinkIcon: undefined,
          };
          const element = create(attrs);
          const placeholder = element.find('[data-test-subj=appLinkIconPlaceholder]');
          expect(placeholder.length).to.be(1);
        });

        it(`uses the title's first letter as the placeholder`, () => {
          const attrs = {
            appSwitcherLinkIcon: undefined,
            appSwitcherLinkTitle: 'Xyz',
          };
          const element = create(attrs);
          const placeholder = element.find('[data-test-subj=appLinkIconPlaceholder]');
          expect(placeholder.text()).to.contain(attrs.appSwitcherLinkTitle[0]);
        });
      });
    });

    describe('appSwitcherLinkTitle attribute', () => {
      it('is displayed', () => {
        const attrs = {
          appSwitcherLinkTitle: 'demo title',
        };
        const element = create(attrs);
        const title = element.find('.app-switcher-link__title');
        expect(title.text().trim()).to.be(attrs.appSwitcherLinkTitle);
      });

      it('is set as a title attribute on the anchor tag', () => {
        const attrs = {
          appSwitcherLinkTitle: 'demo title',
        };
        const element = create(attrs);
        const link = element.find('[data-test-subj=appLink]');
        expect(link.attr('title')).to.be(attrs.appSwitcherLinkTitle);
      });
    });
  });
});
