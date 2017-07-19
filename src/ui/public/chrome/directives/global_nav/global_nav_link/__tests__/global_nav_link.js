import sinon from 'sinon';
import ngMock from 'ng_mock';
import expect from 'expect.js';

import '../global_nav_link';

describe('globalNavLink directive', () => {
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
      <global-nav-link
        is-active="isActive"
        is-disabled="isDisabled"
        tooltip-content="tooltipContent"
        on-click="onClick()"
        url="href"
        kbn-route="kbnRoute"
        icon="icon"
        label="title"
      />
    `;

    const element = $compile(template)(scope);

    scope.$apply(() => {
      Object.assign(scope, attrs);
    });

    return element;
  }

  describe('interface', () => {

    describe('isActive attribute', () => {
      it(`doesn't apply the active class when false`, () => {
        const element = create({
          isActive: false,
        });
        expect(element.hasClass('active')).to.be(false);
      });

      it('applies the active class when true', () => {
        const element = create({
          isActive: true,
        });
        expect(element.hasClass('active')).to.be(true);
      });
    });

    describe('isDisabled attribute', () => {
      it(`doesn't apply the is-global-nav-link-disabled class when false`, () => {
        const element = create({
          isDisabled: false,
        });
        expect(element.hasClass('is-global-nav-link-disabled')).to.be(false);
      });

      it('applies the is-global-nav-link-disabled class when true', () => {
        const element = create({
          isDisabled: true,
        });
        expect(element.hasClass('is-global-nav-link-disabled')).to.be(true);
      });
    });

    describe('tooltipContent attribute', () => {
      it('is applied to the tooltip directive', () => {
        const attrs = {
          tooltipContent: 'hello i am a tooltip',
        };
        const element = create(attrs);
        expect(element.attr('tooltip')).to.be(attrs.tooltipContent);
      });
    });

    describe('onClick attribute', () => {
      it('is called when the link is clicked', () => {
        const attrs = {
          onClick: sinon.spy(),
        };
        const element = create(attrs);
        element.find('[data-test-subj=appLink]').click();
        sinon.assert.called(attrs.onClick);
      });
    });

    describe('href attribute', () => {
      it('is applied to the link', () => {
        const attrs = {
          href: 'link to a website',
        };
        const element = create(attrs);
        const link = element.find('[data-test-subj=appLink]');
        expect(link.attr('href')).to.be(attrs.href);
      });
    });

    describe('kbnRoute attribute', () => {
      it(`is applied to the link when href isn't defined`, () => {
        const attrs = {
          kbnRoute: '#test',
        };
        const element = create(attrs);
        const link = element.find('[data-test-subj=appLink]');
        expect(link.attr('href')).to.be(attrs.kbnRoute);
      });

      it(`isn't applied to the link when href is defined`, () => {
        const attrs = {
          href: 'link to a website',
          kbnRoute: '#test',
        };
        const element = create(attrs);
        const link = element.find('[data-test-subj=appLink]');
        expect(link.attr('href')).not.to.be(attrs.kbnRoute);
      });
    });

    describe('icon attribute', () => {
      describe('when present', () => {
        it('displays the img element', () => {
          const attrs = {
            icon: 'icon url',
          };
          const element = create(attrs);
          const img = element.find('img');
          expect(img.length).to.be(1);
        });

        it('hides the placeholder', () => {
          const attrs = {
            icon: 'icon url',
          };
          const element = create(attrs);
          const placeholder = element.find('[data-test-subj=appLinkIconPlaceholder]');
          expect(placeholder.length).to.be(0);
        });

        it(`is set as the img src`, () => {
          const attrs = {
            icon: 'icon url',
          };
          const element = create(attrs);
          const img = element.find('img');
          expect(img.attr('src')).to.contain(encodeURI(attrs.icon));
        });
      });

      describe('when not present', () => {
        it('hides the img element', () => {
          const attrs = {
            icon: undefined,
          };
          const element = create(attrs);
          const img = element.find('img');
          expect(img.length).to.be(0);
        });

        it('displays the placeholder', () => {
          const attrs = {
            icon: undefined,
          };
          const element = create(attrs);
          const placeholder = element.find('[data-test-subj=appLinkIconPlaceholder]');
          expect(placeholder.length).to.be(1);
        });

        it(`uses the title's first letter as the placeholder`, () => {
          const attrs = {
            icon: undefined,
            title: 'Xyz',
          };
          const element = create(attrs);
          const placeholder = element.find('[data-test-subj=appLinkIconPlaceholder]');
          expect(placeholder.text()).to.contain(attrs.title[0]);
        });
      });
    });
  });
});
