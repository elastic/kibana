---
name: 8.0 Breaking change
about: Breaking changes from 7.x -> 8.0
title: "[Breaking change]"
labels: Feature:Upgrade Assistant, Breaking Change
assignees: ''

---

<!-- 
****************************************
******* LABEL CHANGES NECESSARY ********
****************************************
 
Please add a team label to denote the team that the
breaking change is applicable to. If the work requires
changes to Upgrade Assistant itself, please tag Team:Elasticsearch UI.
 
-->

## Change description

**Which release will ship the breaking change?**

8.0

**Is this a Kibana or Elasticsearch breaking change?**

<!-- Kibana breaking changes can be registered via the Kibana deprecations service. Elasticsearch breaking changes may require custom logic in Upgrade Assistant and assistance from the Elasticsearch UI team. See more details below. -->

**Describe the change. How will it manifest to users?**

**How many users will be affected?**

<!-- e.g. Based on telemetry data, roughly 75% of our users will need to make changes to x. -->
<!-- e.g. A majority of users will need to make changes to x. -->

**Are there any edge cases?**

**[For Kibana deprecations] Can the change be registered with the [Kibana deprecation service](https://github.com/elastic/kibana/blob/main/docs/development/core/server/kibana-plugin-core-server.deprecationsservicesetup.md)?**

<!-- The deprecation service is consumed by the Upgrade Assistant to surface Kibana deprecations.
  It provides a way for Kibana deprecations to be resolved automatically via an API
  or manually by providing step-by-step instructions for users to follow. -->

<!-- Each plugin owner is responsible for registering their deprecations via the service.
  Please link to the issue/PR that will add this functionality. -->

**[For Elasticsearch deprecations] Can the Upgrade Assistant make the migration easier for users? Please explain the proposed solution in as much detail as possible.**

<!-- Upgrade Assistant consumes the ES deprecation info API to surface deprecations to users. In some cases, Upgrade Assistant can provide a way to resolve a particular deprecation returned from the API. Examples include: reindexing an old index, removing deprecated index settings, upgrading or deleting an old Machine Learning model snapshot. -->

<!-- Please provide a detailed explanation on how you foresee the proposed "fix" to work, e.g., "The deprecation will be surfaced via XXX message in the deprecation info API. Upgrade Assistant can call XXX API to resolve this deprecation". See https://github.com/elastic/kibana/issues/91879 as a real-world example. -->
## Test Data

<!-- Provide test data. We can’t build a solution without data to test it against. -->

## Cross links

<!-- Provide context. Cross-link to relevant [Elasticsearch breaking changes](https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-8.0.html), PRs that introduced the breaking change, or other related issues. -->