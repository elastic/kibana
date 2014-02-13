var elasticsearch = require('elasticsearch');
var es = elasticsearch.Client();

es.msearch({
  body: [
    {
      index: 'logstash-2014.02.1111'
    },
    {
      query: { 'match_all': {} }
    }
  ]
}, function (err, resp) {
  console.log(resp);
  es.close();
});