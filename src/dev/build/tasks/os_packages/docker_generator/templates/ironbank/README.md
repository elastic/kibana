# Kibana

**Kibana** lets you visualize your Elasticsearch data and navigate the Elastic Stack,
so you can do anything from learning why you're getting paged at 2:00 a.m. to
understanding the impact rain might have on your quarterly numbers.

For more information about Kibana, please visit
https://www.elastic.co/products/kibana.

### Installation instructions

Please follow the documentation on [running Kibana on Docker](https://www.elastic.co/guide/en/kibana/{{branch}}/docker.html).

### Where to file issues and PRs

- [Issues](https://github.com/elastic/kibana/issues)
- [PRs](https://github.com/elastic/kibana/pulls)

### DoD Restrictions

Due to the [NODE-SECURITY-1184](https://www.npmjs.com/advisories/1184) issue, Kibana users should not use the `ALL_PROXY` environment variable to specify a proxy when installing Kibana plugins with the kibana-plugin command line application.

### Where to get help

- [Kibana Discuss Forums](https://discuss.elastic.co/c/kibana)
- [Kibana Documentation](https://www.elastic.co/guide/en/kibana/current/index.html)

### Still need help?

You can learn more about the Elastic Community and also understand how to get more help
visiting [Elastic Community](https://www.elastic.co/community).

This software is governed by the [Elastic
License](https://github.com/elastic/kibana/blob/{{branch}}/licenses/ELASTIC-LICENSE-2.0.txt),
and includes the full set of [free
features](https://www.elastic.co/subscriptions).

View the detailed release notes
[here](https://www.elastic.co/guide/en/kibana/{{branch}}/release-notes-{{version}}.html).
