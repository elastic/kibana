define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var fromUser = require('components/validate_query/lib/from_user');
  var toUser = require('components/validate_query/lib/to_user');

  require('services/debounce');

  require('modules')
    .get('kibana')
    .directive('validateQuery', function (es, $compile, timefilter, configFile, debounce) {
      return {
        restrict: 'A',
        require: 'ngModel',
        scope: {
          'ngModel': '=',
          'queryInput': '=?',
        },
        link: function ($scope, elem, attr, ngModel) {

          // track request so we can abort it if needed
          var request = {};

          var errorElem = $('<i class="fa fa-ban input-error"></i>').hide();

          var init = function () {
            elem.after(errorElem);
            $scope.ngModel = fromUser($scope.ngModel);
            validator($scope.ngModel);
          };

          var validator = function (query) {
            var index, type;
            if (request.abort) request.abort();

            if ($scope.queryInput) {
              useSearchSource();
            } else {
              useDefaults();
            }

            return sendRequest();

            function useSearchSource() {
              var pattern = $scope.queryInput.get('index');
              if (!pattern) return useDefaults();

              if (_.isString(pattern)) {
                index = pattern;
              } else if (_.isFunction(pattern.toIndexList)) {
                index = pattern.toIndexList();
              } else {
                useDefaults();
              }
            }

            function useDefaults() {
              index = configFile.kibana_index;
              type = '__kibanaQueryValidator';
            }

            function sendRequest() {
              request = es.indices.validateQuery({
                index: index,
                type: type,
                explain: true,
                ignoreUnavailable: true,
                body: {
                  query: query || { match_all: {} }
                }
              })
              .then(success, error);
            }

            function error(resp) {
              var msg;

              ngModel.$setValidity('queryInput', false);

              if (resp.explanations && resp.explanations[0]) {
                msg = resp.explanations[0].error;
              } else {
                msg = resp.body.error;
              }

              errorElem.attr('tooltip', msg);

              // Compile is needed for the tooltip
              $compile(errorElem)($scope);
              errorElem.show();

              return undefined;
            }

            function success(resp) {
              if (resp.valid) {
                ngModel.$setValidity('queryInput', true);
                errorElem.hide();
                return query;
              } else {
                return error(resp);
              }
            }
          };

          var debouncedValidator = debounce(validator, 300, {
            leading: true,
            trailing: true
          });

          ngModel.$parsers.push(fromUser);
          ngModel.$formatters.push(toUser);

          // Use a model watch instead of parser/formatter. Parsers require the
          // user to actually enter input, which may not happen if the back button is clicked
          $scope.$watch('ngModel', function (newValue, oldValue) {
            if (newValue === oldValue) return;
            debouncedValidator(newValue);
          });

          init();
        }
      };
    });
});
