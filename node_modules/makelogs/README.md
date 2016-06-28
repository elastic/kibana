# makelogs 2.0

Simple generator used to push fake HTTP traffic logs into elasticsearch. It uses the node.js client.

This version of makelogs is designed to work with elasticsearch 2.0, and is not compatible with elasticsearch 1.x.

Events are pushed into `logstash-YYYY.MM.DD` formatted indices (configurable using `--indexPrefix`), using the bulk API, and are easily consumed by Kibana.

Documents look like this:

```json
{
  "_index": "logstash-2014.06.17",
  "_type": "nginx",
  "_id": "706786",
  "_score": 11.412156,
  "_source": {
     "index": "logstash-2014.06.17",
     "@timestamp": "2014-06-17T17:00:27.053Z",
     "ip": "225.27.202.82",
     "extension": "html",
     "response": "200",
     "geo": {
        "coordinates": [
           44.23107,
           -94.99893444
        ],
        "src": "IM",
        "dest": "PK",
        "srcdest": "IM:PK"
     },
     "@tags": [
        "error",
        "info"
     ],
     "utc_time": "2014-06-17T17:00:27.053Z",
     "referer": "http://nytimes.com/error/gemini-11",
     "agent": "Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1",
     "clientip": "225.27.202.82",
     "bytes": 5108.1583889899775,
     "request": "/ivan-bella.html",
     "@message": "225.27.202.82 - - [2014-06-17T17:00:27.053Z] \"GET /ivan-bella.html HTTP/1.1\" 200 5108.1583889899775 \"-\" \"Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1\"",
     "spaces": "this   is   a   thing    with lots of     spaces       wwwwoooooo",
     "xss": "<script>console.log(\"xss\")</script>",
     "headings": [
        "<h3>robert-satcher</h5>",
        "http://twitter.com/success/scott-altman"
     ],
     "links": [
        "mamoru-mohri@www.slate.com",
        "http://www.slate.com/info/boris-yegorov",
        "www.twitter.com"
     ],
     "machine": {
        "os": "win 7",
        "ram": 17179869184
     }
  }
}
```

## to install

```sh
npm install -g makelogs
```

then run `makelogs --help` for usage info:

```
$ ./bin/makelogs --help
A utility to generate sample log data.

Usage: node ./bin/makelogs@beta [options]

Options:
  ...
```


The tool is, admittedly, not super configurable. Just tell it how many events you want, how many days to generate data for, and it will cruise.

# Do not use this on any sort of production elasticsearch installation.

The event stream can be a tad unforgiving, and could cause some damage to an elasticsearch cluster under load. It is designed for debugging locally.
