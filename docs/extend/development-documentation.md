---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/development-documentation.html
---

# Documentation during development [development-documentation]

Docs should be written during development and accompany PRs when relevant. There are multiple types of documentation, and different places to add each.


## End user documentation [_end_user_documentation]

Documentation about user facing features should be written in markdown at [https://github.com/elastic/kibana/tree/main/docs](https://github.com/elastic/kibana/tree/main/docs).

To build the docs: 

1. Install the latest version of [docs-builder](https://github.com/elastic/docs-builder): 

   ```sh
   curl -sL https://ela.st/docs-builder-install | sh
   ```

   This downloads the latest binary to `/usr/local/bin`, makes it an executable, and installs it to your user PATH. This means you can use the `docs-builder` command from any location of your machine to deploy and run documentation repositories like `kibana`,  `docs-content` and so on.

2. Use the `serve` command from any `docs` folder to start serving the documentation at [http://localhost:3000](http://localhost:3000):

   ```sh
   docs-builder serve
   ```

   The path to the `docset.yml` file that you want to build can be specified with `-p`.

   :::{important}
   Run `docs-builder` without `serve` to run a full build and detect errors.
   :::


### REST APIs [_rest_apis]

REST APIs should be documented using the following recommended formats:

* [API doc template](https://raw.githubusercontent.com/elastic/docs/master/shared/api-ref-ex.asciidoc)
* [API object definition template](https://raw.githubusercontent.com/elastic/docs/master/shared/api-definitions-ex.asciidoc)


## General developer documentation and guidelines [_general_developer_documentation_and_guidelines]

General developer guildlines and documentation, like this right here, should be written in [asciidoc](http://asciidoc.org/) at [https://github.com/elastic/kibana/tree/main/docs/extend](https://github.com/elastic/kibana/tree/main/docs/extend).
