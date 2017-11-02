import { uiModules } from 'ui/modules';
import uiRoutes from 'ui/routes';

import 'ui/autoload/styles';
import './css/analyze.less';
import template from './templates/index.html';
import utils from './utils';

uiRoutes
.when('/dev_tools/analyzeui', {
  template: template,
  controller: 'analyzeuiController'
});

uiModules
.get('app/analyzeui', [])
.controller('analyzeuiController', function ($http, $scope, $route, $interval, chrome, Notifier) {
  const notify = new Notifier();
  $scope.services = ['analyzer', 'custom_analyzer', 'field', 'compare analyzers'];
  $scope.currentTab = $scope.services[0];
  $scope.title = 'Analyze Api Ui Plugin';
  $scope.description = 'UI for elasticsearch analyze API';
  $scope.showAllAttr = false;

  $scope.formValues = {
    indexName: '',
    text: '',
    analyzer: '',
    tokenizer: '',
    charfilters: utils.initialItems(1),
    filters: utils.initialItems(1),
    field: '',
    analyzersForCompare: utils.initialItems(2)
  };
  this.initializeError = () => {
    $scope.detail = {};
    $scope.show_result = false;
    $scope.esrequest = {};
    $scope.show_esrequest = false;
    $scope.textError = null;
    $scope.indexNameError = null;
    $scope.analyzerError = null;
    $scope.resultAnalyzers = [];
  };

  this.alwaysShowTokenProperties = [
    'token',
    'position'
  ];
  this.hiddenTokenProperties = [
    'bytes', 'pronunciation (en)', 'reading (en)', 'partOfSpeech (en)', 'inflectionType (en)', 'inflectionForm (en)'
  ];

  // UI state.
  // FIXME change index name input to "select"
  //  this.indexNameOptions = [];
  //  this.indexNameOptionsError = null;

  // FIXME call _cat/indices and return indices list + no index name
  // just now, using text box instead of select

  // switch tab
  this.changeTab = (tab) => {
    $scope.currentTab = tab;
    this.initializeError();
  };

  // add input of charfilter function
  this.addCharfilter = () => {
    utils.addItem($scope.formValues.charfilters);
  };
  // remove input of charfilter function
  this.removeCharfilter = ($index) => {
    utils.removeItem($index, $scope.formValues.charfilters);
  };

  // add input of filter function
  this.addFilter = () => {
    utils.addItem($scope.formValues.filters);
  };
  // remove input of charfilter function
  this.removeFilter = ($index) => {
    utils.removeItem($index, $scope.formValues.filters);
  };

  // add input of analyzer function
  this.addAnalyzer = () => {
    utils.addItem($scope.formValues.analyzersForCompare);
  };
  // remove input of analyzer function
  this.removeAnalyzer = ($index) => {
    utils.removeItem($index, $scope.formValues.analyzersForCompare);
  };

  // show short name
  this.shortenName = (name) => {
    if (name.indexOf('.') > 0) {
      return name.substr(name.lastIndexOf('.') + 1);
    }
    return name;
  };

  // for display
  this.getTokenFromTokenstream = (index, target1, target2) => {
    let target = target1;
    if (!target && target2 !== null) {
      target = target2;
    }
    $scope.currentLevelTokenList = [];
    for (const token of target.tokens) {
      if (token.position > index) {
        break;
      }
      if (token.position === index) {
        $scope.currentLevelTokenList.push(token);
      }
    }
    return $scope.currentLevelTokenList.length > 0;
  };

  // filter token properties
  this.filteredCurrentTokenInfo = (token) => {
    if (token !== null) {
      const result = {};
      Object.keys(token).forEach((key) => {
        if (!this.hiddenTokenProperties.includes(key)) {
          result[key] = token[key];
        }
      });
      return result;
    } else {
      return null;
    }
  };

  // switch show/hide properties
  this.hideTokenProperty = (propertyName) => {
    if (this.alwaysShowTokenProperties.includes(propertyName)) {
      return true;
    } else {
      return $scope.showAllAttr;
    }
  };

  // Call analyze function
  this.performAnalyze = () => {
    // initialize
    this.initializeError();

    // FIXME validation logic, text is required
    const param = {
      text: $scope.formValues.text
    };
    if ($scope.formValues.text.trim().length === 0) {
      $scope.textError = 'text should be not null!';
      return;
    }
    if ($scope.formValues.indexName.length > 0) {
      param.indexName = $scope.formValues.indexName.trim();
    }

    if ($scope.currentTab === 'analyzer') {
      if ($scope.formValues.analyzer.length > 0) {
        param.analyzer = $scope.formValues.analyzer.trim();
      }
    } else if ($scope.currentTab === 'field') {
      if ($scope.formValues.field.trim().length === 0) {
        $scope.analyzerError = 'field is required. ';
      }
      if ($scope.formValues.indexName.trim().length === 0) {
        $scope.analyzerError += 'index name is required for "field". ';
      }
      if ($scope.analyzerError) {
        return;
      }
      param.field = $scope.formValues.field.trim();
    } else if ($scope.currentTab === 'custom_analyzer') {
      if ($scope.formValues.tokenizer) {
        let tmpObj = utils.parseCustom($scope, $scope.formValues.tokenizer, 'tokenizer');
        if (tmpObj !== -1) {
          param.tokenizer = tmpObj;
          tmpObj = null;
        } else {
          return;
        }
      }
      if ($scope.formValues.charfilters.length > 0) {
        $scope.formValues.charfilters.forEach((charfilter) => {
          if (charfilter && charfilter.item && charfilter.item.trim().length > 0) {
            if (param.charfilters === undefined) {
              param.charfilters = [];
            }
            const tmpCharfilter = utils.parseCustom($scope, charfilter.item, 'char_filter');
            if (tmpCharfilter !== -1) {
              param.charfilters.push(tmpCharfilter);
            } else {
              return;
            }
          }
        });
      }
      if ($scope.formValues.filters.length > 0) {
        $scope.formValues.filters.forEach((filter) => {
          if (filter && filter.item && filter.item.trim().length > 0) {
            if (param.filters === undefined) {
              param.filters = [];
            }
            const tmpFilter = utils.parseCustom($scope, filter.item, 'filter');
            if (tmpFilter !== -1) {
              param.filters.push(tmpFilter);
            } else {
              return;
            }
          }
        });
      }
    } else if ($scope.currentTab === 'compare analyzers') {
      $scope.formValues.analyzersForCompare.forEach((analyzer) => {
        if (!(analyzer && analyzer.item && analyzer.item.trim().length > 0)) {
          console.log('some analyzer is null');
          return;
        }
      });
    }

    if ($scope.currentTab !== 'compare analyzers') {
      // call kibana server API
      $http.post(chrome.addBasePath('/api/analyzeui/analyze'), param)
        .then(
          (response) => {
            $scope.detail = response.data.detail;
            utils.countTokenStreamLength($scope, response.data.detail);
            $scope.esrequest = response.data.request;
            $scope.show_esrequest = true;
            $scope.show_result = true;
            $scope.showAllAttr = false;
          })
        .catch(error => {
          if (error.data.statusCode === 404) {
            $scope.indexNameError = error.data.message;
          } else if (error.data.statusCode === 400) {
            $scope.analyzerError = error.data.message;
          } else {
            notify.error(error.data);
          }
        });
    } else {
      // multiple analyzers
      param.analyzers = $scope.formValues.analyzersForCompare;

      $http.post(chrome.addBasePath('/api/analyzeui/multi_analyze'), param)
        .then(
          (response) => {
            $scope.resultAnalyzers = response.data.resultAnalyzers;
            $scope.show_result = true;
            let tokenStreamLength = 0;
            $scope.resultAnalyzers.forEach((result) => {

              tokenStreamLength = utils.getLength(tokenStreamLength, result.tokens);
              $scope.tokenIndicesArray = [];
              for (let i = 0; i < tokenStreamLength; i++) {
                $scope.tokenIndicesArray.push(i);
              }
            });
          })
        .catch(error => {
          if (error.data.statusCode === 404) {
            $scope.indexNameError = error.data.message;
          } else if (error.data.statusCode === 400) {
            $scope.analyzerError = error.data.message;
          } else {
            notify.error(error.data);
          }
        });
    }
  };

});
