# Kibana

Kibana is the open source interface to query, analyze, visualize, and manage your data stored in Elasticsearch.

- [Getting Started](#getting-started)
  - [Using a Kibana Release](#using-a-kibana-release)
  - [Building and Running Kibana, and/or Contributing Code](#building-and-running-kibana-andor-contributing-code)
- [Documentation](#documentation)
- [Version Compatibility with Elasticsearch](#version-compatibility-with-elasticsearch)
- [Questions? Problems? Suggestions?](#questions-problems-suggestions)

## Getting Started

If you just want to try Kibana out, check out the [Elastic Stack Getting Started Page](https://www.elastic.co/start) to give it a whirl.

If you're interested in diving a bit deeper and getting a taste of Kibana's capabilities, head over to the [Kibana Getting Started Page](https://www.elastic.co/guide/en/kibana/current/get-started.html).

### Using a Kibana Release

If you want to use a Kibana release in production, give it a test run, or just play around:

- Download the latest version on the [Kibana Download Page](https://www.elastic.co/downloads/kibana).
- Learn more about Kibana's features and capabilities on the
[Kibana Product Page](https://www.elastic.co/kibana).
- We also offer a hosted version of Kibana on our
[Cloud Service](https://www.elastic.co/cloud/as-a-service).

### Building and Running Kibana, and/or Contributing Code

You might want to build Kibana locally to contribute some code, test out the latest features, or try
out an open PR:

- [CONTRIBUTING.md](CONTRIBUTING.md) will help you get Kibana up and running.
- If you would like to contribute code, please follow our [STYLEGUIDE.mdx](STYLEGUIDE.mdx).
- For all other questions, check out the [FAQ.md](FAQ.md).

## Documentation

Visit [Elastic.co](http://www.elastic.co/guide/en/kibana/current/index.html) for the full Kibana documentation.

For information about building the documentation, see the README in [elastic/docs](https://github.com/elastic/docs).

## Version Compatibility with Elasticsearch

### Elasticsearch & Kibana Compatibility

The recommended configuration is to run Elasticsearch and Kibana using the same version number. If you encounter issues on mismatched versions, you will first be asked to upgrade before support or troubleshooting can begin.

- __Major Versions:__ Must strictly match (with exceptions for `prevmajor.last`)
- __Kibana Patch Ahead:__ Kibana can run on a newer patch version than Elasticsearch (e.g. Elasticsearch 9.4.0 with Kibana 9.4.2) to allow easier Kibana-only patching.
- __Kibana Minor Behind:__ Kibana can run using an older minor version than Elasticsearch (e.g. Kibana 9.3.x with Elasticsearch 9.4.x) to simplify rolling upgrades.

_Note: The version numbers below are only examples, meant to illustrate the relationships between different types of version numbers._

| Situation                 | Example Kibana version    | Example ES version | Outcome |
| ------------------------- | ------------------------- |------------------- | ------- |
| Versions are the same.    | 9.4.1                     | 9.4.1              | OK      |
| ES patch number is newer. | 9.4.__0__                 | 9.4.__1__          | Logged warning   |
| ES minor number is newer. | 9.__3__.2                 | 9.__4__.0          | Logged warning   |
| ES major number is newer. | __8__.14.1                | __9__.0.0          | Fatal error      |
| ES patch number is older. | 9.4.__1__                 | 9.4.__0__          | Logged warning   |
| ES minor number is older. | 9.__4__.1                 | 9.__3__.2          | Fatal error      |
| ES major number is older. | __9__.0.0                 | __8__.19.1         | Fatal error      |

## Questions? Problems? Suggestions?

- If you've found a bug or want to request a feature, please create a [GitHub Issue](https://github.com/elastic/kibana/issues/new/choose).
  Please check to make sure someone else hasn't already created an issue for the same topic.
- Need help using Kibana? Ask away on our [Kibana Discuss Forum](https://discuss.elastic.co/c/kibana) and a fellow community member or
Elastic engineer will be glad to help you out.
