require.config({
  baseUrl: '/',
  paths: {
    angular: '/bower_components/angular/angular',
    css: '/bower_components/require-css/css',
    d3: '/bower_components/d3/d3',
    jquery: '/bower_components/jquery/dist/jquery',
    lodash: '/utils/lodash-mixins/index',
    lodash_src: '/bower_components/lodash/lodash',
    moment: '/bower_components/moment/moment',
    nvd3: '/bower_components/nvd3/build/nv.d3',
    nvd3_directives: '/bower_components/angular-nvd3/dist/angular-nvd3',
    numeral: '/bower_components/numeral/numeral',
    text: '/bower_components/requirejs-text/text'
  },
  shim: {
    angular: {
      deps: ['jquery'],
      exports: 'angular'
    },
    nvd3: ['css!bower_components/nvd3/build/nv.d3.css', 'd3'],
    nvd3_directives: ['angular', 'nvd3']
  }
});
