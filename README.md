# Kibana 5.4.0

Kibana is your window into the [Elastic Stack](https://www.elastic.co/products). Specifically, it's
an open source ([Apache Licensed](LICENSE.md)),
browser-based analytics and search dashboard for Elasticsearch.

- [Getting Started](#getting-started)
  - [Using a Kibana Release](#using-a-kibana-release)
  - [Building and Running Kibana, and/or Contributing Code](#building-and-running-kibana-andor-contributing-code)
  - [Snapshot Builds](#snapshot-builds)
- [Documentation](#documentation)
- [Version Compatibility with Elasticsearch](#version-compatibility-with-elasticsearch)
- [Questions? Problems? Suggestions?](#questions-problems-suggestions)

## Getting Started

If you just want to try Kibana out, check out the [Elastic Stack Getting Started Page](https://www.elastic.co/start) to give it a whirl.

If you're interested in diving a bit deeper and getting a taste of Kibana's capabilities, head over to the [Kibana Getting Started Page](https://www.elastic.co/guide/en/kibana/current/getting-started.html).

### Using a Kibana Release

If you want to use a Kibana release in production, give it a test run, or just play around:

- Download the latest version on the [Kibana Download Page](https://www.elastic.co/downloads/kibana).
- Learn more about Kibana's features and capabilities on the
[Kibana Product Page](https://www.elastic.co/products/kibana).
- We also offer a hosted version of Kibana on our
[Cloud Service](https://www.elastic.co/cloud/as-a-service).

### Building and Running Kibana, and/or Contributing Code

You may want to build Kibana locally to contribute some code, test out the latest features, or try
out an open PR:

- [CONTRIBUTING.md](CONTRIBUTING.md) will help you get Kibana up and running.
- If you would like to contribute code, please follow our [STYLEGUIDE.md](STYLEGUIDE.md).
- For all other questions, check out the [FAQ.md](FAQ.md) and
[wiki](https://github.com/elastic/kibana/wiki).

### Snapshot Builds

For the daring, snapshot builds are available. These builds are created nightly and have undergone no formal QA, so they should never be run in production.

| platform |  |
| --- | --- |
| OSX | [tar](https://snapshots.elastic.co/downloads/kibana/kibana-5.4.0-SNAPSHOT-darwin-x86_64.tar.gz) |
| Linux x64 | [tar](https://snapshots.elastic.co/downloads/kibana/kibana-5.4.0-SNAPSHOT-linux-x86_64.tar.gz) [deb](https://snapshots.elastic.co/downloads/kibana/kibana-5.4.0-SNAPSHOT-amd64.deb) [rpm](https://snapshots.elastic.co/downloads/kibana/kibana-5.4.0-SNAPSHOT-x86_64.rpm) |
| Linux x86 | [tar](https://snapshots.elastic.co/downloads/kibana/kibana-5.4.0-SNAPSHOT-linux-x86.tar.gz) [deb](https://snapshots.elastic.co/downloads/kibana/kibana-5.4.0-SNAPSHOT-i386.deb) [rpm](https://snapshots.elastic.co/downloads/kibana/kibana-5.4.0-SNAPSHOT-i686.rpm) |
| Windows | [zip](https://snapshots.elastic.co/downloads/kibana/kibana-5.4.0-SNAPSHOT-windows-x86.zip) |

## Documentation

Visit [Elastic.co](http://www.elastic.co/guide/en/kibana/current/index.html) for the full Kibana documentation.

## Version Compatibility with Elasticsearch

Ideally, you should be running Elasticsearch and Kibana with matching version numbers. If your Elasticsearch has an older version number or a newer _major_ number than Kibana, then Kibana will fail to run. If Elasticsearch has a newer minor or patch number than Kibana, then the Kibana Server will log a warning.

_Note: The version numbers below are only examples, meant to illustrate the relationships between different types of version numbers._

| Situation                 | Example Kibana version     | Example ES version | Outcome |
| ------------------------- | -------------------------- |------------------- | ------- |
| Versions are the same.    | 5.1.2                      | 5.1.2              | 💚 OK      |
| ES patch number is newer. | 5.1.__2__                  | 5.1.__5__          | ⚠️ Logged warning      |
| ES minor number is newer. | 5.__1__.2                  | 5.__5__.0          | ⚠️ Logged warning      |
| ES major number is newer. | __5__.1.2                  | __6__.0.0          | 🚫 Fatal error      |
| ES patch number is older. | 5.1.__2__                  | 5.1.__0__          | ⚠️ Logged warning      |
| ES minor number is older. | 5.__1__.2                  | 5.__0__.0          | 🚫 Fatal error      |
| ES major number is older. | __5__.1.2                  | __4__.0.0          | 🚫 Fatal error      |

## Questions? Problems? Suggestions?

- If you've found a bug or want to request a feature, please create a [GitHub Issue](https://github.com/elastic/kibana/issues/new).
Please check to make sure someone else hasn't already created an issue for the same topic.
- Need help using Kibana? Ask away on our [Kibana Discuss Forum](https://discuss.elastic.co/c/kibana) and a fellow community member or
Elastic engineer will be glad to help you out.
