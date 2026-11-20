# @kbn/workflows-topics

Types for workflows event-bus topics. Each topic lives in its own file and is re-exported from `index.ts`.

The package exports the topic types and the topic name constants. The producing plugin and each consumer call `defineTopic` with that name themselves.
