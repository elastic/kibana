# FTR to Scout Test AI Migration Utilities

These AI prompts help automate the conversion of existing FTR tests to the [Scout](https://github.com/elastic/kibana/tree/main/src/platform/packages/shared/kbn-scout) framework, reducing manual effort and ensuring consistency and correctness during migration.

## What's included

- `ftr-to-scout-skeleton-guide.md` - A prompt you can use to convert an FTR test to a Scout skeleton test
- `what-is-scout.md` - Overview of the Scout framework, its features, fixtures, and how to write API and UI tests

### Requirements

These prompts have been tested with **Claude Sonnet 4.5** and the [**Claude VS Code extension**](https://docs.claude.com/en/docs/claude-code/vs-code), but should work with your LLM of choice. Adjust the prompt syntax as needed for your preferred AI assistant (e.g., GitHub Copilot, ChatGPT, or other code assistants).

# Prompts

## Generate a Scout boilerplate file from an existing FTR test

A “boilerplate” Scout test file refers to a test file containing test case(s) and test suite(s) with no implementation code. These blocks will include `// TODO` comments to guide the developer or the AI in writing the actual test body.

### How to Use

**Sample prompt** (replace the FTR test file path as needed):

```
Generate an empty Scout skeleton from this file:

@src/platform/test/functional/apps/discover/group4/_document_comparison.ts

Instructions:
@src/platform/packages/private/kbn-scout-info/llms/generate-scout-skeleton-from-ftr-test.md contains instructions on how to convert a test
@src/platform/packages/private/kbn-scout-info/llms/what-is-scout.md contains a high-level description of the Scout framework
```

> [!NOTE]
> This prompt uses Claude's `@path/to/import` [syntax](https://docs.claude.com/en/docs/claude-code/memory).

**Sample output**: available [here](https://gist.github.com/csr/71e635d856154df64f7d1ccb7e8333df).
