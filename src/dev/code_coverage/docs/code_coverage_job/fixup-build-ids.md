# Build ID to Build Number FIXUP

## Problem
When we switched to buildkite, from Jenkins we started using a **uuid** *(alphanumeric)* instead of a numeric value.

## Fix
First we're a going to [change the ingestion](https://github.com/elastic/kibana/pull/129622) to use the correct value.

But this still leaves us with documents with value we do not want
### Find all docs that have letters in the build id
```
GET kibana_code_coverage/_search?_source_includes=ciRunUrl,BUILD_ID
{
  "query": {
    "regexp": {
      "BUILD_ID": {
        "value": "[a-z]*"
      }
    }
  }
}
```
