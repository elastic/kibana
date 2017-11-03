import expect from 'expect.js';
import ngMock from 'ng_mock';
import '../timelion_expression_suggestions';

describe('Timelion expression suggestions directive', function () {
  let scope;
  let $compile;

  beforeEach(ngMock.module('kibana'));

  beforeEach(inject(function ($injector) { // eslint-disable-line no-undef
    $compile = $injector.get('$compile');
    scope = $injector.get('$rootScope').$new();
  }));

  describe('attributes', function () {
    describe('suggestions', function () {
      let element = null;
      const template =
        `<timelion-expression-suggestions
          suggestions="list"
        ></timelion-expression-suggestions>`;

      beforeEach(function () {
        element = $compile(template)(scope);
        scope.$apply(() => {
          scope.list = [{ name: 'suggestion1' }, { name: 'suggestion2' }, { name: 'suggestion3' }];
        });
      });

      it('are rendered', function () {
        expect(element.find('[data-test-subj="timelionSuggestionListItem"]').length).to.be(scope.list.length);
      });
    });
  });
});
