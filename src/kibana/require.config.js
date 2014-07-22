require.config({
  baseUrl: './kibana',
  paths: {
    kibana: './index',
    config_file: '../config',

    // special utils
    routes: 'utils/routes/index',
    errors: 'components/errors',
    modules: 'utils/modules',
    lodash: 'utils/_mixins',

    // bower_components
    angular: '../bower_components/angular/angular',
    'angular-mocks': '../bower_components/angular-mocks/angular-mocks',
    'angular-route': '../bower_components/angular-route/angular-route',
    'angular-bootstrap': '../bower_components/angular-bootstrap/ui-bootstrap-tpls',
    'angular-bindonce': '../bower_components/angular-bindonce/bindonce',
    'angular-ui-ace': '../bower_components/angular-ui-ace/ui-ace',
    'angular-elastic': '../bower_components/angular-elastic/elastic',
    ace: '../bower_components/ace-builds/src-noconflict/ace',
    async: '../bower_components/async/lib/async',
    css: '../bower_components/require-css/css',
    d3: '../bower_components/d3/d3',
    text: '../bower_components/requirejs-text/text',
    elasticsearch: '../bower_components/elasticsearch/elasticsearch.angular',
    jquery: '../bower_components/jquery/dist/jquery',
    lodash_src: '../bower_components/lodash/dist/lodash',
    moment: '../bower_components/moment/moment',
    gridster: '../bower_components/gridster/dist/jquery.gridster',
    jsonpath: '../bower_components/jsonpath/lib/jsonpath',
    inflection: '../bower_components/inflection/lib/inflection',
    file_saver: '../bower_components/FileSaver/FileSaver',
    bower_components: '../bower_components'
  },
  shim: {
    angular: {
      deps: ['jquery'],
      exports: 'angular'
    },
    jsonpath: {
      exports: 'jsonPath'
    },
    gridster: ['jquery'],
    'angular-route': ['angular'],
    'angular-mocks': ['angular'],
    'elasticsearch': ['angular'],
    'angular-bootstrap': ['angular'],
    'angular-bindonce': ['angular'],
    'angular-ui-ace': ['angular', 'ace'],
    inflection: {
      exports: 'inflection'
    },
    file_saver: {
      exports: 'saveAs'
    }
  },
  waitSeconds: 60
});
