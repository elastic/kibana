Sense
=====

A JSON aware developer's interface to Elasticsearch. Comes with handy machinery such as syntax highlighting, API suggestions,
formatting and code folding.

Installation
-----

Sense is a Kibana app. To get up and running you will first need to download Kibana and install as instructed [here](https://www.elastic.co/downloads/kibana).
Once Kibana is installed, you can simply install Sense running the following command from your Kibana folder:

```
$ ./bin/kibana plugin --install elastic/sense
```

Now start your Kibana server by running:

```
$ ./bin/kibana
```

Sense should be available on `localhost:5601/app/sense` (assuming Kibana defaults).

For more information and advanced setting please see the [documentation](https://www.elastic.co/guide/en/sense/current/installing.html).


Screenshots
-----


### Handy API suggestions

Sense offers handy contextual suggestion to the Elasticsearch API.

<img src="https://github.com/elastic/sense/raw/master/docs/images/readme_api_suggestions.png" width="400px" title="API Suggestions">

### Format validation

Sometimes it is hard to find that little missing comma. Sense automatically highlights and explains invalid input.

<img src="https://github.com/elastic/sense/raw/master/docs/images/readme_errors.png" width="400px" title="Format validation">

### Scope collapsing

Working on a big JSON query can be distracting. Using the mouse or via a handy keyboard shortcut (Ctrl/Cmd+Option+0)
, Sense allows you to focus on a sub section and fold others away.

<img src="https://github.com/elastic/sense/raw/master/docs/images/readme_scope_collapsing.png" width="400px" title="Folding">

### Auto formatting

Type your commands however you want and let Sense format them for you.

<img src="https://github.com/elastic/sense/raw/master/docs/images/readme_auto_formatting_mix.png" width="400px" title="Auto formatting">

### Submit multiple requests at once

When testing or trying things out you frequently need to repeat the same sequence of commands.
Just write them all in Sense, select and submit multiple requests to Elasticsearch.

<img src="https://github.com/elastic/sense/raw/master/docs/images/readme_multiple_requests.png" width="400px" title="Multiple Requests">

### Copy and Paste cURL commands

Once done, you can copy one or more requests as cURL commands (and of course paste them back)

<img src="https://github.com/elastic/sense/raw/master/docs/images/readme_copy_as_curl.png" width="400px" title="Copy As Curl">

Results in:

```
# Delete all data in the `website` index
curl -XDELETE "http://localhost:9200/website"

# Create a document with ID 123
curl -XPUT "http://localhost:9200/website/blog/123" -d'
{
  "title": "My first blog entry",
  "text":  "Just trying this out...",
  "date":  "2014/01/01"
}'
```



Documentation
--------

Visit [elastic.co](https://www.elastic.co/guide/en/sense/current/index.html) for the full documentation.


