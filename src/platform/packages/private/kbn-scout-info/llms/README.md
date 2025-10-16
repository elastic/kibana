# AI-assisted FTR to Scout test migration (🧪 experimental)

This guide provides prompts to help you migrate existing FTR tests to the [Scout](https://github.com/elastic/kibana/tree/main/src/platform/packages/shared/kbn-scout) framework.

> [!IMPORTANT]
> These prompts are experimental. Please carefully review all AI-generated code for mistakes before merging.

## Recommended tools

For best results, we recommend the tools below.

### Claude Code

We recommend **Claude Code** (and the **Claude Sonnet 4.5** model). The [**VS Code extension**](https://docs.claude.com/en/docs/claude-code/vs-code) is a user-friendly way to use Claude Code. The prompts below use Claude's `@path/to/file.md` [syntax](https://docs.claude.com/en/docs/claude-code/memory) to reference specific files in the codebase. Check if your AI assitant of choice supports this syntax.

### Semantic Code Search MCP server

The **[Semantic Code Search MCP server](https://github.com/elastic/semantic-code-search-mcp-server)** is a powerful tool for navigating large codebases like Kibana, and it helps you find relevant files using natural language queries. For example, you might want to **search for existing FTR page objects or API helpers** (e.g. "Uptime page objects" or "data views API helpers") to provide as input to the steps below. While you can find files manually, this approach is often faster and more comprehensive.

> [!NOTE]
> Elastic employees should have access to a dedicated Elasticsearch cluster with the Kibana project already indexed and ready for use. Search Slack for more information.

## Step 1: Generate Scout boilerplate files

First, identify the FTR files you want to migrate. Use the following prompt to generate the empty test skeletons and Playwright configuration file:

```
Generate empty Scout skeleton files for this plugin (look at all files in this folder and create several Scout tests):

@x-pack/solutions/observability/test/functional/apps/uptime

Instructions:
@src/platform/packages/private/kbn-scout-info/llms/generate-scout-skeleton-from-ftr-test.md contains instructions on how to perform this task
@src/platform/packages/private/kbn-scout-info/llms/what-is-scout.md contains a high-level description of the Scout framework
```

**Checkpoint**: you should now see one or more Scout test files (one for each FTR test) and a Playwright configuration file. The test cases will contain `// TODO` comments to guide the next steps.

> [!NOTE]
> A “boilerplate” Scout test file refers to a test file containing test case(s) and test suite(s) with no implementation code. These blocks will include `// TODO` comments to guide the developer or the AI in writing the actual test body.

## Step 2: Create or update Scout page objects

Next, convert the FTR page objects to Scout page objects. This prompt creates new Scout page objects or updates existing ones based on your FTR files. Be sure to update the file paths:

```
Generate a Scout page object for this FTR file (or update existing ones):

@x-pack/solutions/observability/test/functional/apps/uptime/settings.ts

Instructions:
@src/platform/packages/private/kbn-scout-info/llms/generate-scout-page-objects.md contains instructions on how to perform this task
@src/platform/packages/private/kbn-scout-info/llms/what-is-scout.md contains a high-level description of the Scout framework
@src/platform/packages/private/kbn-scout-info/llms/scout-page-objects.md contains a high-level overview of page objects in Scout
```

**Checkpoint**: the AI will generate or modify Scout page objects. For this step, you may need to manually move these files to the correct directory (either the plugin's page objects folder, or one of the Scout packages), and register them in the `pageObjects` fixture. Refer to the official Scout documentation.

## Step 3 (optional): Create or update Scout API helpers

If your FTR tests rely on API helpers to prepare the test environment, use this prompt to create or update Scout API helpers.

First you may use the Semantic code search MCP server to find existing API helpers:

```
Use semantic code search to find existing data views API helpers.
```

Alternatively, you can search for these files manually, or attempt to have the AI assistant search them for you (without semantic search).

Then, use a similar prompt:

```
Can you generate Scout API helpers for these files:

src/platform/plugins/shared/data_views/server/routes.ts - Main route registration file
src/platform/plugins/shared/data_views/server/rest_api_routes/public/index.ts - Public routes index
src/platform/plugins/shared/data_views/server/constants.ts - Path constants
src/platform/plugins/shared/data_views/common/constants.ts - Common constants including internal paths
src/platform/plugins/shared/data_views/server/rest_api_routes/internal/existing_indices.ts - Existing indices endpoint
src/platform/plugins/shared/data_views/server/rest_api_routes/internal/fields_for.ts - Fields for wildcard endpoint
src/platform/plugins/shared/data_views/server/rest_api_routes/internal/fields.ts - Fields endpoint
src/platform/plugins/shared/data_views/server/rest_api_routes/internal/has_es_data.ts - Has ES data endpoint
```

## Step 4: Implement the test logic

With the boilerplate and page objects in place, you can now fill in the test logic. For the best results, run this prompt for **each Scout test file individually** (this way we don't _saturate_ the LLM's context window).

Remember to update the file paths in the prompt.

```
The following path contains Scout boilerplate tests:

@x-pack/solutions/observability/plugins/uptime/test/scout/ui/tests

Please implement the following test file:

@x-pack/solutions/observability/plugins/uptime/test/scout/ui/tests/settings.spec.ts

Use the original FTR test as a reference:

@x-pack/solutions/observability/test/functional/apps/uptime/settings.ts
@x-pack/solutions/observability/test/functional/apps/uptime/index.ts

Guidelines:
- Each test must have assertions.
- The end goal is to create working tests. Pay special attention to semantics. You MUST use methods that exist. If you need an API helper, import it rather than creating it (unless absolutely necessary).
- The TODO comments are guides, not prescriptive rules.
```

**Checkpoint**: the LLM should now populate the Scout test files from Step 1 with implementation code based on the original FTR tests.

## Step 5: Run your tests

Finally, run your new Scout tests. We recommend using the `--ui` mode to easily troubleshoot any failures.
