# elasticsearch

Elasticsearch client builds for bower.

# Install

Install with `bower`
```
bower install elasticsearch
```

Add a `<script>` to your html file and off you go!:
```
<script src="/bower_components/elasticsearch/elasticsearch.js"></script>
<script>
  var client = elasticsearch.Client({
    host: 'localhost:9200'
  });
</script>
```

## If you are using Angular
Use `elasticsearch.angular.js` instead. This will create an `elasticsearch` module with an `esFactory` that you can use.
```
/*
 * create your app module, specify "elasticsearch" as a dependency
 */
var app = angular.module('myApp', ['elasticsearch']);

/*
 * create a service, which provides your elasticsearch client
 * to other parts of your application
 */
app.service('es', function (esFactory) {
  return esFactory({
    host: 'localhost:9200',
    // ...
  });
});
```

## If you are using jQuery
Use `elasticsearch.jquery.js` instead. Rather than a global `elasticsearch` it will create a `jQuery.es` namespace.
```
var client = new $.es.Client({
  hosts: 'localhost:9200'
});
```

# Submit Issues, Pull Requests, etc to [elasticsearch-js](https://github.com/elasticsearch/elasticsearch-js).