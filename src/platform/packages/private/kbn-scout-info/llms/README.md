# AI-assisted FTR to Scout test migration (🧪 experimental)

This guide provides prompts to help you migrate existing FTR tests to the [Scout](https://github.com/elastic/kibana/tree/main/src/platform/packages/shared/kbn-scout) framework.

> [!IMPORTANT]
> These prompts are experimental. Please carefully review all AI-generated code for mistakes before merging.

For best results, we recommend using **Claude Sonnet 4.5**, which has a helpful [**VS Code extension**](https://docs.claude.com/en/docs/claude-code/vs-code). The prompts below use Claude's `@path/to/file.md` [syntax](https://docs.claude.com/en/docs/claude-code/memory) syntax to reference specific files in the codebase. Check if your LLM of choice also supports this syntax.

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

## Step 3: Implement the test logic

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

## Step 4: Run your tests

Finally, run your new Scout tests. We recommend using the `--ui` mode to easily troubleshoot any failures.
