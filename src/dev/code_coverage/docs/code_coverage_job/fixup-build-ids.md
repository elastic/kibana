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

### Example painless snippet to get the correct value
This is just a simple learning spike on using painless.  
It takes the ciRunUrl, and parses out the build number, from it.
```
POST /_scripts/painless/_execute
{
  "script": {
    "source": """
def buildNum(def x) { /(.*\/)(\d*$)/.matcher(x).replaceAll('$2') }

return buildNum(params.ciRunUrl)
    """,
    "params": {
      "ciRunUrl": "https://buildkite.com/elastic/kibana-code-coverage-main/builds/249",
      "BUILD_ID": "3733f02a-9aef-490e-a798-c2a193d3ec90"
    }
  }
}
```