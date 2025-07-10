---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/development-documentation.html
---

# Documentation during development [development-documentation]

Docs should be written during development and accompany PRs when relevant. There are multiple types of documentation, and different places to add each.


## End user documentation [_end_user_documentation]

Documentation about user facing features should be written in [asciidoc](http://asciidoc.org/) at [https://github.com/elastic/kibana/tree/main/docs](https://github.com/elastic/kibana/tree/main/docs).

To build the docs, you must clone the [elastic/docs](https://github.com/elastic/docs) repo as a sibling of your {{kib}} repo. Follow the instructions in that project’s README for getting the docs tooling set up.

**To build the docs:**

```bash
node scripts/docs.js --open
```


### REST APIs [_rest_apis]

REST APIs should be documented using the following recommended formats:

* [API doc template](https://raw.githubusercontent.com/elastic/docs/master/shared/api-ref-ex.asciidoc)
* [API object definition template](https://raw.githubusercontent.com/elastic/docs/master/shared/api-definitions-ex.asciidoc)


## General developer documentation and guidelines [_general_developer_documentation_and_guidelines]

General developer guildlines and documentation, like this right here, should be written in [asciidoc](http://asciidoc.org/) at [https://github.com/elastic/kibana/tree/main/docs/extend](https://github.com/elastic/kibana/tree/main/docs/extend).
