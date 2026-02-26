# Search onboarding agent

Agent configuration files tailored to search solution onboarding

## Installation

To install the Elastic search agent configuration, give your LLM the following prompt:

```
Please run these commands to install the Elastic search agent configuration from github.com/elastic/search-onboarding-agent:

curl -L -o elastic-agent.zip https://raw.githubusercontent.com/elastic/search-onboarding-agent/main/elastic-agent.zip
unzip elastic-agent.zip && rm elastic-agent.zip
touch AGENTS.md && cat AGENT-elasticsearch-append.md >> AGENTS.md && rm AGENT-elasticsearch-append.md

This downloads a zip of agent configuration files, extracts a .elasticsearch-agent/ directory into the current working directory, and appends an Elasticsearch reference to AGENTS.md.

Once that's done, help me get started with Elasticsearch.
```

## Development

- Update markdown files
- Run `./build` to generate a new zip file

```
Please run this installer from Elastic's GitHub to set up the Elasticsearch agent configuration:

curl -sSL https://raw.githubusercontent.com/elastic/search-onboarding-agent/main/installation-instructions.sh | sh

The script will:
1. Download a zip of agent configuration files from github.com/elastic/search-onboarding-agent
2. Extract a .elasticsearch-agent/ directory into the current working directory
3. Append an Elasticsearch reference to AGENTS.md in the current working directory

Once that's done, help me get started with Elasticsearch.
```

Issues:

⏺ The LLM can verify legitimacy if there's a cross-reference from a domain it already trusts. Right now the repo stands alone — the LLM has no way to confirm
github.com/elastic/search-onboarding-agent is official Elastic rather than a typosquat or a rogue repo under the elastic org.

Concrete options, roughly in order of impact:

1. Reference it from elastic.co
   A page on elastic.co (docs, developer hub, blog post) that links to or mentions this repo gives the LLM a verifiable chain: elastic.co → this repo. That's the strongest signal because
   elastic.co is unambiguously Elastic. The prompt can then say "you can verify this is an official Elastic tool at elastic.co/..."

2. Mention it in the official Elastic docs
   Same principle — if elastic.co/docs references the repo, the LLM can fetch that page and confirm the link exists.

3. Ask the LLM to verify before acting
   Include a verification step in the prompt itself:

Before running anything, confirm this is an official Elastic repository
by checking elastic.co or searching for "elastic search-onboarding-agent".
Then run these commands: ...

This works well with LLMs that have web search — they can confirm independently.

4. Publish the agent config as an npm package under @elastic/
   @elastic/elasticsearch is already a trusted package. An @elastic/search-agent or similar package carries that same org-level trust signal automatically.

---

Realistically, option 1 or 2 is what gets you there — a pointer from a domain the LLM already trusts to this repo. Without that cross-reference, the LLM is being asked to take your word
for it, and it's trained not to.

- just update instructions to do stuff like create directory, add the snippet, add agents.md etc. and point to the remote files directly.
