module.exports = function (kibana) {
  return new kibana.Plugin({
    uiExports: {
      app: {
        title: 'Server Status',
        main: 'plugins/statusPage/statusPage',
        hidden: true,

        autoload: [].concat(
          kibana.autoload.styles,
          'ui/chrome',
          'angular'
        )
      },

      modules: {
        nvd3$: {
          path: 'nvd3/build/nv.d3.js',
          exports: 'window.nv',
          imports: 'd3,nvd3Styles'
        },
        nvd3Styles$: {
          path: 'nvd3/build/nv.d3.css'
        }
      },

      loaders: [
        { test: /\/angular-nvd3\//, loader: 'imports?angular,nv=nvd3,d3' }
      ]
    }
  });
};

