# CouchDB Changes

This plugin is for capturing the stream of the `_changes` API and feeding it into Logstash.

## Testing

This plugin has some requirements for testing.  Following normal dev installation procedure (i.e. `bundle install`), you must also have a CouchDB instance running on localhost.  In order to test SSL connectivity, a certificate, private key, and CA certificate have been provided.

### CouchDB configuration

Locate the `local.ini` file of your CouchDB installation and edit with your favorite text editor.

You will need to reconfigure the `[ssl]` section similar to this:

```
[ssl]
port = 6984
cert_file = /path/to/localhost.cert
key_file = /path/to/localhost.key
```

The files `localhost.cert` and `localhost.key` are in `spec/inputs` of this repository.  You can copy them out to the any path you like. Configure `cert_file` and `key_file` with the full path to wherver you put those files.

Next, in the `[daemons]` configuration block, you need to make sure you see:

```
httpd={couch_httpd, start_link, []}
httpsd={couch_httpd, start_link, [https]}
```

Chances are that you will only need to add the `httpsd` line.  Be sure to put `https` in the square braces at the end of that line.

### Running CouchDB locally

Launch CouchDB by calling the binary, or with your preferred method.  In the STDOUT or log file you should see something like this:

```
$ couchdb
Apache CouchDB 1.6.1 (LogLevel=info) is starting.
Apache CouchDB has started. Time to relax.
[info] [<0.31.0>] Apache CouchDB has started on http://127.0.0.1:5984/
[info] [<0.31.0>] Apache CouchDB has started on https://127.0.0.1:6984/
```

If you see lines like this with 127.0.0.1, you only require a local instance of Elasticsearch to be prepared to run the rspec tests.

### Ensure a local instance of Elasticsearch is running

It must be running on 127.0.0.1:9200

### Execute the tests

The tests can be run with `bundle exec rspec -t elasticsearch`.  Adding `-f d` shows more detail.

```
bundle exec rspec -t elasticsearch -f d
Using Accessor#strict_set for specs
Run options:
  include {:elasticsearch=>true}
  exclude {:redis=>true, :socket=>true, :performance=>true, :elasticsearch_secure=>true, :broken=>true, :export_cypher=>true, :integration=>true}

inputs/couchdb_changes
  Load couchdb documents
    agent(/Users/buh/WORK/logstash-plugins/logstash-input-couchdb_changes/spec/inputs/couchdb_changes_spec.rb:127:in) runs
  Test sincedb
    agent(/Users/buh/WORK/logstash-plugins/logstash-input-couchdb_changes/spec/inputs/couchdb_changes_spec.rb:266:in) runs
  Test document updates
    agent(/Users/buh/WORK/logstash-plugins/logstash-input-couchdb_changes/spec/inputs/couchdb_changes_spec.rb:195:in) runs
  Test Secure Connection
    agent(/Users/buh/WORK/logstash-plugins/logstash-input-couchdb_changes/spec/inputs/couchdb_changes_spec.rb:468:in) runs
  Test document deletion
    agent(/Users/buh/WORK/logstash-plugins/logstash-input-couchdb_changes/spec/inputs/couchdb_changes_spec.rb:336:in) runs
  Test authenticated connectivity
    agent(/Users/buh/WORK/logstash-plugins/logstash-input-couchdb_changes/spec/inputs/couchdb_changes_spec.rb:403:in) runs

Finished in 14.44 seconds
6 examples, 0 failures

Randomized with seed 31091
```

Your results should look something like this.