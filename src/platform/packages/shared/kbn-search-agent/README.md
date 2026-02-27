# Search onboarding agent

Agent configuration files tailored to search solution onboarding

## Installation

Copy this prompt to your LLM (won't work until it's properly hosted in kibana):

```
Fetch and run this remote command:

curl -sSL https://raw.githubusercontent.com/elastic/kibana/releases/install-agent.sh | sh

Then help me get started with Elasticsearch.
```

## Development

- Update markdown files
- Run `./build` to generate a new zip file

Safer prompt:

```
Fetch and run this remote script:
curl -sSL https://raw.githubusercontent.com/wildemat/kibana/search-agent/src/platform/packages/shared/kbn-search-agent/install-agent.sh | sh
Then help me get started with Elasticsearch.
```
