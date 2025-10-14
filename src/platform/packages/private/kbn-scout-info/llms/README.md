# FTR to Scout Test AI Migration Utilities

These AI prompts help automate the conversion of existing FTR tests to the [Scout](https://github.com/elastic/kibana/tree/main/src/platform/packages/shared/kbn-scout) framework, reducing manual effort and ensuring consistency and correctness during migration.

## What's included

- `ftr-to-scout-skeleton-guide.md` - A prompt you can use to convert an FTR test to a Scout skeleton test
- `generate-scout-skeleton-from-ftr-test.md` - A prompt you can use to generate a Scout page object from an existing FTR test
- `what-is-scout.md` - Overview of the Scout framework, its features, fixtures, and how to write API and UI tests

### Requirements

These prompts have been tested with **Claude Sonnet 4.5** and the [**Claude VS Code extension**](https://docs.claude.com/en/docs/claude-code/vs-code), but should work with your LLM of choice. Adjust the prompt syntax as needed for your preferred AI assistant (e.g., GitHub Copilot, ChatGPT, or other code assistants).

# Prompts

## Generate a Scout boilerplate files from existing FTR tests (step 1)

A “boilerplate” Scout test file refers to a test file containing test case(s) and test suite(s) with no implementation code. These blocks will include `// TODO` comments to guide the developer or the AI in writing the actual test body.

### How to Use

**Sample prompt** (replace the FTR test file path as needed):

```
Generate empty Scout skeleton files for this plugin (look at all files in this folder and create several Scout tests):

@x-pack/solutions/observability/test/functional/apps/uptime

Instructions:
@src/platform/packages/private/kbn-scout-info/llms/generate-scout-skeleton-from-ftr-test.md contains instructions on how to perform this task
@src/platform/packages/private/kbn-scout-info/llms/what-is-scout.md contains a high-level description of the Scout framework
```

> [!NOTE]
> This prompt uses Claude's `@path/to/import` [syntax](https://docs.claude.com/en/docs/claude-code/memory).

**Sample output**: available [here](https://gist.github.com/csr/71e635d856154df64f7d1ccb7e8333df).

## Generate Scout page objects from an existing FTR test (step 2)

**Sample prompt** (replace the FTR test file path as needed):

```
Generate a Scout page object for this FTR file:

@x-pack/solutions/observability/test/functional/apps/uptime/settings.ts

Instructions:
@src/platform/packages/private/kbn-scout-info/llms/generate-scout-page-objects.md contains instructions on how to perform this task
@src/platform/packages/private/kbn-scout-info/llms/what-is-scout.md contains a high-level description of the Scout framework
@src/platform/packages/private/kbn-scout-info/llms/scout-page-objects.md contains a high-level overview of page objects in Scout
```

## Migrate FTR tests to Scout (step 3)

**Sample prompt** (replace the FTR test file path as needed):

```
This path has Scout boilerplate tests:

@x-pack/solutions/observability/plugins/uptime/test/scout/ui/tests

Please fill out this test:

@x-pack/solutions/observability/plugins/uptime/test/scout/ui/tests/settings.spec.ts

Use the original FTR test as a reference:

@x-pack/solutions/observability/test/functional/apps/uptime/settings.ts
@x-pack/solutions/observability/test/functional/apps/uptime/index.ts

Guidelines:
- Each test must have assertions.
- The end-goal should be working tests. Pay special attention to semantics. You MUST use methods that exist. If you need an API helper, import it rather than creating it (unless absolutely necessary).
- The TODO comments are orientative, not prescriptive.

You may need to create page objects. Follow the instructions below to do so.

Instructions:
@src/platform/packages/private/kbn-scout-info/llms/generate-scout-page-objects.md contains instructions on how to perform this task
@src/platform/packages/private/kbn-scout-info/llms/what-is-scout.md contains a high-level description of the Scout framework
@src/platform/packages/private/kbn-scout-info/llms/scout-page-objects.md contains a high-level overview of page objects in Scout
```
