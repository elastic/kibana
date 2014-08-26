Angular Elastic
===============

Elastic (autosize) textareas for AngularJS, without jQuery dependency.

[See it in action](http://monospaced.github.io/angular-elastic).

Usage
-----

as attribute

    <textarea msd-elastic ng-model="foo">
      ...
    </textarea>

as class

    <textarea class="msd-elastic" ng-model="bar">
      ...
    </textarea>

optionally append whitespace to the end of the height calculation (an extra newline improves the apperance when animating)

    <textarea msd-elastic="\n" ng-model="foo">
      ...
    </textarea>

    <textarea class="msd-elastic: \n;" ng-model="bar">
      ...
    </textarea>

or configure whitespace globally

    app.config(['msdElasticConfig', function(config) {
      config.append = '\n\n';
    }])

Install
-------

    bower install angular-elastic

    npm install angular-elastic

Include the `elastic.js` script provided by this component in your app, and add `monospaced.elastic` to your app’s dependencies.

Support
-------

__Modern browsers__ only—Internet Explorer 6, 7 & 8 retain their default textarea behaviour.

Demo
----------------

* [monospaced.github.io/angular-elastic](http://monospaced.github.io/angular-elastic)
* [plunker](http://plnkr.co/edit/9y6YLriAwsK9hqdu72WT?p=preview)


How it works
------------

By creating a hidden textarea that mirrors the textarea to which the directive was applied, Angular Elastic can measure the required height and adjust the textarea accordingly. Adjustments are done on:

* Keystroke events
* Window resize events
* Model changes

This works well in most cases with no additional code required other than described in the Usage section above. However, it may occur that the adjustment must be invoked manually at a time that is not covered by the events listed above. E.g. textareas with the style `display: none;` may not have a valid width  in Safari which produces incorrect adjustments. In this case the adjustment needs to be invoked once these textareas become visible. For that Angular Elastic listens to the `elastic:adjust` event on its scope. To invoke the adjustment for all textareas covered by Angular Elastic use:

    $rootScope.$broadcast('elastic:adjust');

Inspiration
----------------

* [jQuery Autosize](http://www.jacklmoore.com/autosize/)

* [jQuery Elastic](http://unwrongest.com/projects/elastic/)

