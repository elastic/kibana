# Migrate FTR tests to Scout with AI (experimental)

Welcome! In this guide we'll explore how to migrate existing FTR tests to [Scout](https://github.com/elastic/kibana/tree/main/src/platform/packages/shared/kbn-scout) with the help of AI. We provide some predefined prompts for you to start migrating one or multiple FTR test files.

> [!IMPORTANT]
> These prompts are experimental. Please carefully check for mistakes before merging code to `main`.

### Which LLM should I use?

This is up to you. We have seen good results with **Claude Sonnet 4.5** and the [**Claude VS Code extension**](https://docs.claude.com/en/docs/claude-code/vs-code). We recommend copying the prompts below, adapting them to point to your specific FTR files, and pressing "Enter" to submit your request.

Note that the user prompts that we provide below use the `@path/to/file.md` [syntax](https://docs.claude.com/en/docs/claude-code/memory) to reference specific files in the codebase.

## Step 1: Generate Scout boilerplate file(s)

First, identify which FTR file(s) you'd like to migrate to Scout, and copy the file paths to your clipboard.

Use this prompt to generate one or multiple Scout boilerplate files:

```
Generate empty Scout skeleton files for this plugin (look at all files in this folder and create several Scout tests):

@x-pack/solutions/observability/test/functional/apps/uptime

Instructions:
@src/platform/packages/private/kbn-scout-info/llms/generate-scout-skeleton-from-ftr-test.md contains instructions on how to perform this task
@src/platform/packages/private/kbn-scout-info/llms/what-is-scout.md contains a high-level description of the Scout framework
```

> [!NOTE]
> A “boilerplate” Scout test file refers to a test file containing test case(s) and test suite(s) with no implementation code. These blocks will include `// TODO` comments to guide the developer or the AI in writing the actual test body.

## Step 2: Create Scout page objects (or update existing ones)

Your FTR functional test likely relies on one or multiple page objects to interact with the user interface. Use this prompt to create (or update an existing) Scout page object. Make sure you update the file paths with your FTR file(s):

```
Generate a Scout page object for this FTR file (or update existing ones):

@x-pack/solutions/observability/test/functional/apps/uptime/settings.ts

Instructions:
@src/platform/packages/private/kbn-scout-info/llms/generate-scout-page-objects.md contains instructions on how to perform this task
@src/platform/packages/private/kbn-scout-info/llms/what-is-scout.md contains a high-level description of the Scout framework
@src/platform/packages/private/kbn-scout-info/llms/scout-page-objects.md contains a high-level overview of page objects in Scout
```

## Step 3: fill out the Scout boilerplate code

Now that the agent has created one or more Scout boilerplate files (in step 1) and created and/or updated the existing Scout page objects (in step 2), we're ready to "fill out" the empty Scout boilerplate test cases with real code. We recommend running this prompt for **each** Scout test file to get the best results. When you're done converting a single file.

Use this prompt (as always, make sure to update the file paths):

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
```

## Step 4: run your tests

How did it go? It's now time to [run your tests](./run-scout-tests.md). We recommend the `--ui` mode to best troubleshoot failing tests.
