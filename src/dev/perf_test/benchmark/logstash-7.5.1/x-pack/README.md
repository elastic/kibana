# Elastic License Functionality

This directory tree contains files subject to the Elastic License. The files subject to the Elastic License are grouped in this directory to clearly separate them from files licensed under the Apache License 2.0.

# Logstash X-Pack

Set of plugins that form Logstash X-Pack features.

# Setup

Logstash X-Pack features are a default part of Logstash; as X-Pack features provide integrations with the rest of the Elastic Stack, they will need to be configured to point to an Elasticsearch instance in order to work.

## Opting Out of X-Pack

If you are unable or unwilling to run the Elastic-Licensed X-Pack Features and Functions, OSS-only distributions are available from the [downloads page][]; to run Logstash from source without X-Pack, ensure that your environment variable `OSS` is exported with a value of `true`:

~~~ sh
export OSS=true
~~~

[downloads page]: https://www.elastic.co/downloads/logstash

# Configuration

To configure x-pack settings, you can edit config/logstash.yml and add `xpack.*` configs from the [logstash x-pack settings][].


[logstash x-pack settings]: https://www.elastic.co/guide/en/logstash/current/settings-xpack.html

# Building documentation

This repo contains information that is used in the Logstash Reference.

To build the Logstash Reference on your local machine, use the docbldls or docbldlsx build commands defined in https://github.com/elastic/docs/blob/master/doc_build_aliases.sh
