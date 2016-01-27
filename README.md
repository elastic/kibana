# Kibana 5.0.0-snapshot

Kibana is an open source ([Apache Licensed](https://github.com/elastic/kibana/blob/master/LICENSE.md)), browser based analytics and search dashboard for Elasticsearch. Kibana is a snap to setup and start using. Kibana strives to be easy to get started with, while also being flexible and powerful, just like Elasticsearch.

## Requirements

- Elasticsearch version 2.2.0 or later
- Kibana binary package

## Installation

* Download: [http://www.elastic.co/downloads/kibana](http://www.elastic.co/downloads/kibana)
* Extract the files
* Run `bin/kibana` on unix, or `bin\kibana.bat` on Windows.
* Visit [http://localhost:5601](http://localhost:5601)


## Upgrade from previous version

* Move any custom configurations in your old kibana.yml to your new one
* Reinstall plugins
* Start or restart Kibana

## Quick Start

You're up and running! Fantastic! Kibana is now running on port 5601, so point your browser at http://YOURDOMAIN.com:5601.

The first screen you arrive at will ask you to configure an **index pattern**. An index pattern describes to Kibana how to access your data. We make the guess that you're working with log data, and we hope (because it's awesome) that you're working with Logstash. By default, we fill in `logstash-*` as your index pattern, thus the only thing you need to do is select which field contains the timestamp you'd like to use. Kibana reads your Elasticsearch mapping to find your time fields - select one from the list and hit *Create*.

Congratulations, you have an index pattern! You should now be looking at a paginated list of the fields in your index or indices, as well as some informative data about them. Kibana has automatically set this new index pattern as your default index pattern. If you'd like to know more about index patterns, pop into to the [Settings](#settings) section of the documentation.

**Did you know:** Both *indices* and *indexes* are acceptable plural forms of the word *index*. Knowledge is power.

Now that you've configured an index pattern, you're ready to hop over to the [Discover](#discover) screen and try out a few searches. Click on **Discover** in the navigation bar at the top of the screen.

## Documentation

Visit [Elastic.co](http://www.elastic.co/guide/en/kibana/current/index.html) for the full Kibana documentation.

## How issues work
At any given time the Kibana team at Elastic is working on dozens of features and enhancements to Kibana and other projects at Elastic. When you file an issue we'll take the time to digest it, consider solutions, and weigh its applicability to both the broad Kibana user base and our own goals for the project. Once we've completed that process we will assign the issue a priority.

- **P1**: A high priority issue that affects almost all Kibana users. Bugs that would cause incorrect results, security issues and features that would vastly improve the user experience for everyone. Work arounds for P1s generally don't exist without a code change.
- **P2**: A broadly applicable, high visibility, issue that enhances the usability of Kibana for a majority users.
- **P3**: Nice-to-have bug fixes or functionality. Work arounds for P3 items generally exist.
- **P4**: Niche and special interest issues that may not fit our core goals. We would take a high quality pull for this if implemented in such a way that it does not meaningfully impact other functionality or existing code. Issues may also be labeled P4 if they would be better implemented in Elasticsearch.
- **P5**: Highly niche or in opposition to our core goals. Should usually be closed. This doesn't mean we wouldn't take a pull for it, but if someone really wanted this they would be better off working on a plugin. The Kibana team will usually not work on P5 issues but may be willing to assist plugin developers on IRC.

#### How to express the importance of an issue
Let's just get this out there: **Feel free to +1 an issue**. That said, a +1 isn't a vote. We keep up on highly commented issues, but comments are but one of many reasons we might, or might not, work on an issue. A solid write up of your use case is more likely to make your case than a comment that says *+10000*.

#### My issue isn't getting enough attention
First of all, sorry about that, we want you to have a great time with Kibana! You should join us on IRC (#kibana on freenode) and chat about it. Github is terrible for conversations. With that out of the way, there are a number of variables that go into deciding what to work on. These include priority, impact, difficulty, applicability to use cases, and last, and importantly: What we feel like working on.

### I want to help!
**Now we're talking**. If you have a bugfix or new feature that you would like to contribute to Kibana, please **find or open an issue about it before you start working on it.** Talk about what you would like to do. It may be that somebody is already working on it, or that there are particular issues that you should know about before implementing the change.

We enjoy working with contributors to get their code accepted. There are many approaches to fixing a problem and it is important to find the best approach before writing too much code.

When you're ready to start writing code, check out our [contributing](CONTRIBUTING.md) guide, which explains how to get Kibana running for development and how to get your change successfully merged.

## Snapshot Builds

For the daring, snapshot builds are available. These builds are created after each commit to the master branch, and therefore are not something you should run in production.

| platform |  |  |
| --- | --- | --- |
| OSX | [tar](http://download.elastic.co/kibana/kibana-snapshot/kibana-5.0.0-snapshot-darwin-x64.tar.gz) | [zip](http://download.elastic.co/kibana/kibana-snapshot/kibana-5.0.0-snapshot-darwin-x64.zip) |
| Linux x64 | [tar](http://download.elastic.co/kibana/kibana-snapshot/kibana-5.0.0-snapshot-linux-x64.tar.gz) | [zip](http://download.elastic.co/kibana/kibana-snapshot/kibana-5.0.0-snapshot-linux-x64.zip) |
| Linux x86 | [tar](http://download.elastic.co/kibana/kibana-snapshot/kibana-5.0.0-snapshot-linux-x86.tar.gz) | [zip](http://download.elastic.co/kibana/kibana-snapshot/kibana-5.0.0-snapshot-linux-x86.zip) |
| Windows | [tar](http://download.elastic.co/kibana/kibana-snapshot/kibana-5.0.0-snapshot-windows.tar.gz) | [zip](http://download.elastic.co/kibana/kibana-snapshot/kibana-5.0.0-snapshot-windows.zip) |
