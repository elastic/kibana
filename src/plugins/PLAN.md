# Plugins: updates including provide, apps, uses, and public

This is a meta ticket describing our general intention for coming updates to the kibana plugins system.

The story of a plugin starts in development. While developing a kibana plugin assets do not need to be organized in any specific way. The only requirement is a `kibana.plugin.js` file at the root of the source directory. This file describes where things are and the primary exports for this plugin. In the future, this file may describe things like development server setups, and maybe kibana plugins that this plugins requires.


Consider the following project structure


```sh
~/dev/my-kibana-plugin
  kibana.config.js
  package.json # [1]
  node_modules
  src/
    main.js # [2]
    routes.js # [3]
    public/ # [4]
      pie/PieChart.js
      table/
        table.css
        table.js
      scratchpad/
        controller.js
        view.html
        style.css

# [1] your project will likely have npm dependencies that should be listed here
# [2] the default `main` file is main.js, but you can change this in kibana.config.js
# [3] your `main` file can require other files, or define things like routes inline, it's up to you
# [4] place a `public/` next to your `main` file to serve static assets
```


From the structure of this project we can make a few guesses about what type of functionality it provides. `src/routes.js` and `src/api.js` probably extend the servers router, `pie/PieChart.js` and `table/table.js` probably define modules that we can require from the browser, but in order to know exactly what this plugin provides we should look at the `kibana.config.js` file.

Here are the contents of the `kibana.config.js` file:


```js
module.exports = function (kibana) {
  var _ = require('lodash');
  var Promise = require('bluebird');

  return new kibana.Plugin({

    // we define the globally unique id for our plugin.
    // kibana server will fail to start if two plugins use
    // the same id
    id: 'my-kibana-plugin',

    // version numbers help users track which versions
    // of plugin-x is compatible with plugin-y
    version: '1.0.0',

    // an init function gives this plugin access to the
    // hapi server, which we can extend freely
    init: function (server, options) {

      // pass the server to the routes and api module
      // so that they can extend it freely
      require('./routes')(server);
      require('./api')(server);
    },

    // the exports section defines the different types
    // of modules that this plugin provides to other plugins.
    // For now this only describes the modules exported for
    // the front-end
    uiExports: {

      // an app is the highest level ui-component that a plugin
      // can export. apps get an icon on the app page and the option
      // to define routes within the kibana chrome
      app: {

        // These values define how the app will be represented in the kibana app switcher
        title: 'Scratchpad',
        description: 'Just a sample app for showing what plugins can do!'
        icon: 'plugins/my-kibana-plugins/scratchpad/logo.png',

        // when you want to run your app, which module should we load?
        main: 'plugins/my-kibana-plugins/scratchpad/controller',

        // what modules from other plugins does your app use?
        uses: [
          'visTypes',
          'spyModes',
          'fieldFormats'
        ]
      },

      // visTypes, fieldForamtters, and other module types are exposed
      // by simply listing their module ids
      visTypes: [
        'plugins/my-kibana-plugins/pie/PieChart',
        'plugins/my-kibana-plugins/table/table'
      ]

    }
  });
};
```

As the comments in this file point out, there are many ways to customize a plugin and even building a comprehensive configuration (involving several types of exports and direct server interaction) is not terribly difficult to understand.


## loading an app

An application is loaded by visiting the `/app/:pluginId` route. This route opens up the standard Kibana bootstrap.html file with a configuration that loads all of the modules listed in the apps `uses:` config, as well as the `main:` module file. At this point, the main module file will define it's routes with the angular router, bootstrap kicks off angular, and the standard angular launch process begins! :rocket:


## a note about routes

While most plugins will likely provide ui components and things like visualizations, accessing api services like the `/_mget` and `/config` apis will change slightly.

| method | current | new |
| ------ | ------- | --- |
| GET    | `/`     | `/app/:pluginId` |
| GET    | `/elasticsearch/*`| `/api/:pluginId/elasticsearch/*` |

Module ids used across plugins will not change though, and public directories will also remain unchanged

```
GET /plugins/:pluginId/js/index.js
GET /plugins/:pluginId/css/main.css
GET /plugins/:pluginId/imgs/logo.ong
```

## app main file

Building apps in the browser won't change at all, the same modules that used to define routes, visualizations, etc. will still be used tomorrow. These apis are going to be used from the app's main file now though, which and access to a new `'chrome'` module will be provided for modifying kibana's navbar

```js
require('chrome')
.setLogo()
.setBackgroundColor()
.setTabs([
  {
    name: 'Tab 1',
    url: '/tab-1/',
    order: -Infinity
  }
])
.setRootController('myController', function (deps...) {
  // build the myController value, which will live outside ng-view, and persist across page views
})

require('routes').when('/', {
  view: requrie('plugins/my-kibana-plugin/home.awesome.html')
})
.otherwise({
  redirect: '/'
})
```